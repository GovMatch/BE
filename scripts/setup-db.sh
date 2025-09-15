#!/bin/bash
# 데이터베이스 초기화 스크립트 (SQL 파일 실행용)

echo "데이터베이스 초기화 시작..."

# schema.sql 실행 (필요시)
# psql $DATABASE_URL -f prisma/schema.sql

# data.sql 실행 (필요시)  
# psql $DATABASE_URL -f prisma/data.sql

echo "데이터베이스 초기화 완료!"