USE foolproof_exam;

-- Demo credentials are intentionally non-production and are for the hackathon demo only.
INSERT INTO users (username,password_hash,role,full_name,email) VALUES
('admin.demo','9ab397c0df6b04d0e847645ad74c746b952e7da08f76df7bf7056e3b8facfa0d','ADMIN','Platform Administrator','admin@demo.local'),
('authority.demo','9ab397c0df6b04d0e847645ad74c746b952e7da08f76df7bf7056e3b8facfa0d','AUTHORITY','Exam Conducting Officer','authority@demo.local'),
('student01','58dd397a05c9a84f0410db03eecab337583862ae104aaf84a7f2e949c289c948','CANDIDATE','Aarav Sharma','student01@demo.local'),
('student02','58dd397a05c9a84f0410db03eecab337583862ae104aaf84a7f2e949c289c948','CANDIDATE','Diya Patel','student02@demo.local'),
('student03','58dd397a05c9a84f0410db03eecab337583862ae104aaf84a7f2e949c289c948','CANDIDATE','Kabir Mehta','student03@demo.local'),
('proctor.demo','4c2753eca2da2633cd4b6dd2ad324ffe7f8e5724989daaaa6e30e9b58d68579f','PROCTOR','Exam Proctor','proctor@demo.local'),
('reviewer.demo','e753f93f58b3c72ee0fc45efba83701f481dd5f7142bf7672d7c9a757e0d60b7','REVIEWER','Integrity Reviewer','reviewer@demo.local'),
('evaluator.demo','9f164ad61377c91d2eaaf7b4853595f8534fd7fbc0bfd707aa8246d23296a8dc','EVALUATOR','Evaluation Officer','evaluator@demo.local')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), active=1;

SET @authority_id=(SELECT id FROM users WHERE username='authority.demo');
INSERT INTO exams (code,title,duration_minutes,total_marks,scheduled_start,scheduled_end,status,assurance_level,offline_resilient,version_no,created_by)
VALUES ('FP-CSE-001','CSE Secure Semester Examination',30,20,'2026-09-20 10:00:00','2026-09-20 10:30:00','SCHEDULED','CRITICAL',1,1,@authority_id)
ON DUPLICATE KEY UPDATE title=VALUES(title);

SET @exam_id=(SELECT id FROM exams WHERE code='FP-CSE-001');
INSERT INTO questions (exam_id,question_no,prompt,option_a,option_b,option_c,option_d,correct_option,marks,topic,difficulty,version_no,approved) VALUES
(@exam_id,1,'Which data structure follows FIFO order?','Stack','Queue','Tree','Heap','B',2,'DSA','EASY',1,1),
(@exam_id,2,'What is the average time complexity of binary search on a sorted array?','O(n)','O(log n)','O(n log n)','O(1)','B',2,'Algorithms','EASY',1,1),
(@exam_id,3,'Which protocol translates domain names to IP addresses?','DNS','DHCP','FTP','SMTP','A',2,'Networks','EASY',1,1),
(@exam_id,4,'Which SQL command removes rows matching a condition?','DROP','DELETE','ALTER','CREATE','B',2,'DBMS','EASY',1,1),
(@exam_id,5,'Which OS technique allows a process to use an address space larger than physical memory?','Paging','Polling','Spooling','Fragmentation','A',2,'Operating Systems','MEDIUM',1,1),
(@exam_id,6,'Which traversal uses a queue in a graph?','DFS','BFS','Dijkstra','Kruskal','B',2,'Graphs','EASY',1,1),
(@exam_id,7,'Which HTTP status means Not Found?','200','301','404','500','C',2,'Web','EASY',1,1),
(@exam_id,8,'Which normal form removes partial dependency?','1NF','2NF','3NF','BCNF','B',2,'DBMS','MEDIUM',1,1),
(@exam_id,9,'What does ACID I represent in databases?','Isolation','Atomicity','Durability','Consistency','B',2,'DBMS','MEDIUM',1,1),
(@exam_id,10,'Which algorithm is a divide-and-conquer sorting algorithm?','Merge Sort','Prim','Kruskal','Dijkstra','A',2,'Algorithms','MEDIUM',1,1)
ON DUPLICATE KEY UPDATE prompt=VALUES(prompt);

INSERT IGNORE INTO enrollments (exam_id,candidate_id,enrollment_status)
SELECT @exam_id,id,'READY' FROM users WHERE username IN ('student01','student02','student03');
