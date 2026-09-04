import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import PDFDocument from 'pdfkit';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({limit:'2mb'}));

const pool = mysql.createPool({host:process.env.MYSQL_HOST||'localhost',port:Number(process.env.MYSQL_PORT||3306),user:process.env.MYSQL_USER||'foolproof_admin',password:process.env.MYSQL_PASSWORD||'FoolProof@2026!',database:process.env.MYSQL_DATABASE||'foolproof_exam',connectionLimit:10});
const hash = (s)=>crypto.createHash('sha256').update(s).digest('hex');
const eventHash=(prev,payload)=>hash(`${prev||''}|${JSON.stringify(payload)}`);

async function audit(actor, action, type, id, metadata={}) {
  const [rows]=await pool.query('SELECT event_hash FROM audit_log ORDER BY id DESC LIMIT 1');
  const prev=rows[0]?.event_hash||'';
  const body={actor_user_id:actor||null,action,entity_type:type,entity_id:String(id??''),metadata};
  const h=eventHash(prev,body);
  await pool.query('INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,metadata_json,prev_hash,event_hash) VALUES (?,?,?,?,?,?,?)',[actor||null,action,type,String(id??''),JSON.stringify(metadata),prev,h]);
  return h;
}

app.get('/api/health', async (_req,res)=>{try{await pool.query('SELECT 1');res.json({ok:true,database:'mysql',time:new Date().toISOString()});}catch(e){res.status(503).json({ok:false,database:'unavailable',error:e.message});}});

app.post('/api/auth/login', async (req,res)=>{
  const {username,password}=req.body;
  if(!username||!password) return res.status(400).json({error:'username and password required'});
  try{
    const [rows]=await pool.query('SELECT id,username,role,full_name,email,active,password_hash FROM users WHERE username=? LIMIT 1',[username]);
    const u=rows[0];
    if(!u||!u.active||u.password_hash!==hash(password)) return res.status(401).json({error:'Invalid credentials'});
    delete u.password_hash; await audit(u.id,'LOGIN','USER',u.id,{role:u.role});
    res.json({user:u,token:`demo-${u.id}-${Date.now()}`});
  }catch(e){res.status(500).json({error:e.message});}
});

app.get('/api/exams', async (_req,res)=>{try{const [rows]=await pool.query('SELECT * FROM exams ORDER BY scheduled_start DESC');res.json(rows);}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/exams/:id', async (req,res)=>{try{const [[exam]]=await pool.query('SELECT * FROM exams WHERE id=?',[req.params.id]); if(!exam)return res.status(404).json({error:'Exam not found'}); const [questions]=await pool.query('SELECT id,question_no,prompt,option_a,option_b,option_c,option_d,marks,topic,difficulty,version_no,approved FROM questions WHERE exam_id=? ORDER BY question_no',[req.params.id]); const [candidates]=await pool.query("SELECT e.id,e.enrollment_status,u.id candidate_id,u.username,u.full_name,u.email FROM enrollments e JOIN users u ON u.id=e.candidate_id WHERE e.exam_id=?",[req.params.id]); res.json({exam,questions,candidates});}catch(e){res.status(500).json({error:e.message});}});

app.post('/api/exams', async (req,res)=>{try{const {code,title,duration_minutes,total_marks,scheduled_start,scheduled_end,assurance_level='CRITICAL',offline_resilient=true,created_by}=req.body; const [r]=await pool.query('INSERT INTO exams(code,title,duration_minutes,total_marks,scheduled_start,scheduled_end,status,assurance_level,offline_resilient,created_by) VALUES (?,?,?,?,?,?,\'SCHEDULED\',?,?,?)',[code,title,duration_minutes,total_marks,scheduled_start,scheduled_end,assurance_level,offline_resilient?1:0,created_by||null]); await audit(created_by,'CREATE_EXAM','EXAM',r.insertId,{code,title}); res.json({id:r.insertId});}catch(e){res.status(400).json({error:e.message});}});

app.post('/api/exams/:id/questions', async (req,res)=>{try{const q=req.body; const [r]=await pool.query('INSERT INTO questions(exam_id,question_no,prompt,option_a,option_b,option_c,option_d,correct_option,marks,topic,difficulty,approved) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)',[req.params.id,q.question_no,q.prompt,q.option_a,q.option_b,q.option_c,q.option_d,q.correct_option,q.marks,q.topic,q.difficulty]); await audit(q.created_by,'CREATE_QUESTION','QUESTION',r.insertId,{exam_id:req.params.id,question_no:q.question_no}); res.json({id:r.insertId});}catch(e){res.status(400).json({error:e.message});}});

app.post('/api/attempts/start', async (req,res)=>{try{const {exam_id,candidate_id}=req.body; const [[existing]]=await pool.query('SELECT * FROM attempts WHERE exam_id=? AND candidate_id=? ORDER BY id DESC LIMIT 1',[exam_id,candidate_id]); if(existing && ['ACTIVE','OFFLINE','RECONNECTING'].includes(existing.status)) return res.json(existing); const uuid=crypto.randomUUID(); const [r]=await pool.query('INSERT INTO attempts(exam_id,candidate_id,session_uuid,status,started_at,last_server_sync) VALUES (?,?,?,\'ACTIVE\',NOW(),NOW())',[exam_id,candidate_id,uuid]); await pool.query('UPDATE enrollments SET enrollment_status=\'STARTED\' WHERE exam_id=? AND candidate_id=?',[exam_id,candidate_id]); await audit(candidate_id,'START_ATTEMPT','ATTEMPT',r.insertId,{exam_id}); const [[attempt]]=await pool.query('SELECT * FROM attempts WHERE id=?',[r.insertId]); res.json(attempt);}catch(e){res.status(500).json({error:e.message});}});

app.get('/api/attempts/:id', async (req,res)=>{try{const [[attempt]]=await pool.query('SELECT a.*,e.title,e.code,e.duration_minutes,e.total_marks FROM attempts a JOIN exams e ON e.id=a.exam_id WHERE a.id=?',[req.params.id]); if(!attempt)return res.status(404).json({error:'Attempt not found'}); const [answers]=await pool.query('SELECT * FROM answers WHERE attempt_id=?',[req.params.id]); const [events]=await pool.query('SELECT * FROM integrity_events WHERE attempt_id=? ORDER BY occurred_at,id',[req.params.id]); res.json({attempt,answers,events});}catch(e){res.status(500).json({error:e.message});}});

app.post('/api/attempts/:id/sync', async (req,res)=>{const conn=await pool.getConnection(); try{await conn.beginTransaction(); const {answers=[],events=[],status='ACTIVE'}=req.body; for(const a of answers){await conn.query(`INSERT INTO answers(attempt_id,question_id,selected_option,time_spent_seconds,screen_facing_seconds,looking_down_seconds) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE selected_option=VALUES(selected_option),time_spent_seconds=VALUES(time_spent_seconds),screen_facing_seconds=VALUES(screen_facing_seconds),looking_down_seconds=VALUES(looking_down_seconds)`,[req.params.id,a.question_id,a.selected_option||null,a.time_spent_seconds||0,a.screen_facing_seconds||0,a.looking_down_seconds||0]);}
 let prevRows=await conn.query('SELECT event_hash FROM integrity_events WHERE attempt_id=? ORDER BY id DESC LIMIT 1',[req.params.id]); let prev=prevRows[0][0]?.event_hash||''; for(const e of events){const body={attempt_id:Number(req.params.id),event_type:e.event_type,severity:e.severity||'INFO',question_id:e.question_id||null,description:e.description,confidence:e.confidence??null,evidence_ref:e.evidence_ref||null,occurred_at:e.occurred_at||new Date().toISOString()}; const h=eventHash(prev,body); await conn.query('INSERT INTO integrity_events(attempt_id,event_type,severity,question_id,description,confidence,evidence_ref,occurred_at,prev_hash,event_hash) VALUES (?,?,?,?,?,?,?,?,?,?)',[req.params.id,body.event_type,body.severity,body.question_id,body.description,body.confidence,body.evidence_ref,new Date(body.occurred_at),prev,h]); prev=h; }
 await conn.query('UPDATE attempts SET status=?,last_server_sync=NOW() WHERE id=?',[status,req.params.id]); await conn.commit();res.json({ok:true,synced_at:new Date().toISOString(),event_chain_tail:prev});}catch(e){await conn.rollback();res.status(500).json({error:e.message});}finally{conn.release();}});

app.post('/api/attempts/:id/submit', async (req,res)=>{try{const {submission_hash}=req.body; await pool.query('UPDATE attempts SET status=\'SUBMITTED\',submitted_at=NOW(),submission_hash=?,last_server_sync=NOW() WHERE id=?',[submission_hash||hash(JSON.stringify(req.body)),req.params.id]); await pool.query("UPDATE enrollments e JOIN attempts a ON a.exam_id=e.exam_id AND a.candidate_id=e.candidate_id SET e.enrollment_status='SUBMITTED' WHERE a.id=?",[req.params.id]); await audit(null,'SUBMIT_ATTEMPT','ATTEMPT',req.params.id,{submission_hash}); res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});

app.get('/api/proctor/attempts', async (_req,res)=>{try{const [rows]=await pool.query(`SELECT a.id,a.session_uuid,a.status,a.started_at,a.submitted_at,u.username,u.full_name,e.title,e.code,COALESCE(SUM(CASE WHEN ie.severity='VIOLATION' THEN 1 ELSE 0 END),0) violation_count,COALESCE(SUM(CASE WHEN ie.severity='ANOMALY' THEN 1 ELSE 0 END),0) anomaly_count,COALESCE(SUM(CASE WHEN ie.severity='TECHNICAL' THEN 1 ELSE 0 END),0) technical_count FROM attempts a JOIN users u ON u.id=a.candidate_id JOIN exams e ON e.id=a.exam_id LEFT JOIN integrity_events ie ON ie.attempt_id=a.id GROUP BY a.id ORDER BY a.started_at DESC`);res.json(rows);}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/attempts/:id/question-metrics', async (req,res)=>{try{const [rows]=await pool.query(`SELECT q.question_no,q.prompt,a.selected_option,a.time_spent_seconds,a.screen_facing_seconds,a.looking_down_seconds,q.marks FROM answers a JOIN questions q ON q.id=a.question_id WHERE a.attempt_id=? ORDER BY q.question_no`,[req.params.id]);res.json(rows);}catch(e){res.status(500).json({error:e.message});}});

app.post('/api/evaluations/:attemptId', async (req,res)=>{try{const {evaluator_id,final_score,notes=''}=req.body; const [[attempt]]=await pool.query('SELECT exam_id,candidate_id FROM attempts WHERE id=?',[req.params.attemptId]); if(!attempt)return res.status(404).json({error:'attempt not found'}); const [qs]=await pool.query('SELECT q.id,q.marks,a.selected_option,q.correct_option FROM questions q JOIN answers a ON a.question_id=q.id AND a.attempt_id=? WHERE q.exam_id=?',[req.params.attemptId,attempt.exam_id]); const auto=qs.reduce((s,q)=>s+(q.selected_option===q.correct_option?Number(q.marks):0),0); const final=final_score==null?auto:Number(final_score); await pool.query(`INSERT INTO evaluations(attempt_id,evaluator_id,auto_score,final_score,status,notes,evaluated_at) VALUES (?,?,?,?,\'EVALUATED\',?,NOW()) ON DUPLICATE KEY UPDATE evaluator_id=VALUES(evaluator_id),auto_score=VALUES(auto_score),final_score=VALUES(final_score),status=\'EVALUATED\',notes=VALUES(notes),evaluated_at=NOW()`,[req.params.attemptId,evaluator_id||null,auto,final,notes]); await pool.query('UPDATE attempts SET status=\'RESULT_READY\',score=? WHERE id=?',[final,req.params.attemptId]); await pool.query("UPDATE enrollments e JOIN attempts a ON a.exam_id=e.exam_id AND a.candidate_id=e.candidate_id SET e.enrollment_status='EVALUATED' WHERE a.id=?",[req.params.attemptId]); res.json({auto_score:auto,final_score:final});}catch(e){res.status(500).json({error:e.message});}});

app.post('/api/results/:attemptId/publish', async (req,res)=>{try{await pool.query('UPDATE exams e JOIN attempts a ON a.exam_id=e.id SET e.status=\'PUBLISHED\' WHERE a.id=?',[req.params.attemptId]);await pool.query("UPDATE enrollments e JOIN attempts a ON a.exam_id=e.exam_id AND a.candidate_id=e.candidate_id SET e.enrollment_status='RESULT_PUBLISHED' WHERE a.id=?",[req.params.attemptId]);await audit(req.body.actor_id,'PUBLISH_RESULT','ATTEMPT',req.params.attemptId,{});res.json({ok:true});}catch(e){res.status(500).json({error:e.message});}});

app.get('/api/results/:attemptId', async (req,res)=>{try{const [[row]]=await pool.query(`SELECT a.id attempt_id,a.session_uuid,a.score,a.submitted_at,u.full_name,u.username,e.title,e.code,e.total_marks,e.scheduled_start FROM attempts a JOIN users u ON u.id=a.candidate_id JOIN exams e ON e.id=a.exam_id WHERE a.id=?`,[req.params.attemptId]); if(!row)return res.status(404).json({error:'Result not found'});res.json(row);}catch(e){res.status(500).json({error:e.message});}});

app.get('/api/results/:attemptId/pdf', async (req,res)=>{try{const [[r]]=await pool.query(`SELECT a.id attempt_id,a.session_uuid,a.score,a.submitted_at,u.full_name,u.username,e.title,e.code,e.total_marks FROM attempts a JOIN users u ON u.id=a.candidate_id JOIN exams e ON e.id=a.exam_id WHERE a.id=?`,[req.params.attemptId]);if(!r)return res.status(404).end();res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename=result-${r.username}.pdf`);const doc=new PDFDocument({margin:48});doc.pipe(res);doc.fontSize(24).text('FOOLPROOF EXAM INTEGRITY PLATFORM');doc.moveDown();doc.fontSize(18).text('Official Examination Result');doc.moveDown();doc.fontSize(12);[['Candidate',r.full_name],['Candidate ID',r.username],['Exam',r.title],['Exam Code',r.code],['Attempt ID',String(r.attempt_id)],['Session',r.session_uuid],['Score',`${r.score} / ${r.total_marks}`],['Submitted',new Date(r.submitted_at).toLocaleString()],['Verification ID',`FP-${r.attempt_id}-${hash(r.session_uuid).slice(0,10).toUpperCase()}`]].forEach(([k,v])=>doc.text(`${k}: ${v}`));doc.moveDown();doc.text('This demo result is generated after submission, integrity processing and evaluation.');doc.end();}catch(e){res.status(500).json({error:e.message});}});

app.get('/api/audit', async (_req,res)=>{try{const [rows]=await pool.query('SELECT id,actor_user_id,action,entity_type,entity_id,metadata_json,prev_hash,event_hash,created_at FROM audit_log ORDER BY id DESC LIMIT 100');res.json(rows);}catch(e){res.status(500).json({error:e.message});}});

const port=Number(process.env.PORT||4000); app.listen(port,()=>console.log(`FoolProof backend listening on http://localhost:${port}`));
