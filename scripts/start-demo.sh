#!/usr/bin/env bash
set -e
printf '%s\n' 'FoolProof Exam Platform demo' 
printf '%s\n' '1) Start MySQL and load db/schema.sql then db/seed.sql' 
printf '%s\n' '2) Copy backend/.env.example to backend/.env and verify credentials' 
printf '%s\n' '3) Run: npm install --workspaces' 
printf '%s\n' '4) Terminal A: npm run dev:backend' 
printf '%s\n' '5) Terminal B: npm run dev:frontend' 
printf '%s\n' '6) Optional secure client: FP_FRONTEND_URL=http://localhost:5173 npm run start:electron'
