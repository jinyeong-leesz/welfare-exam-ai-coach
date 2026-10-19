# 검증 기록 (2026-10-19)

## 변경 전
- GitHub API에서 main/index.html의 Manus iframe과 sw.js의 화면 파일 중심 캐시 확인.
- 연결 계정 jinyeong-leesz, 저장소 admin/push 권한 확인.
- 기존 Pages 주소에서 외부 iframe 껍데기 확인.
- Manus 직접 주소에서 학습 홈 화면이 표시됨. 전체 기능·서버 지속 가용성을 확인한 것은 아님.

## 구현 검사
`node --test tests/*.test.cjs`: 8개 테스트 통과.
- 39문항의 ID·정답·과목·창작 구분 검증
- 오답 → 1·3·7일 복습 → 완료
- 기한 전 정답의 단계 유지, 늦은 복습, 재오답 초기화
- 잘못된 선택지 거부
- 시험별 통계와 한국 시간 자정/연속 학습
- 백업 왕복·손상된 입력 거부
- manifest 범위, precache 필수 파일, iframe 제거

## 검증 범위
- 첫 구현 커밋: ec750eb2f409b74b25fcdb103384d461faa16dd8.
- GitHub Actions 실행 39199426287: Checkout, Configure Pages, Upload static site, Deploy to GitHub Pages 모두 success. 2026-10-19 13:26 KST 완료.
- 원격 브라우저에서는 기존 iframe 화면이 계속 표시되어 새 UI의 클릭·저장·설치 검증을 완료하지 못함. 캐시 또는 배포 전파 문제인지 원인을 확정하지 않음.
- 브라우저 내부 서비스워커 관리 URL은 도구 정책으로 차단되었고 localhost 접속도 ERR_BLOCKED_BY_CLIENT로 제한됨. 별도 우회는 하지 않음.
- 서비스워커 테스트에서 전체 필수 자산 설치 후 네트워크 실패를 주입하여 각 자산 반환, 다른 앱 캐시 보존, 외부 요청/POST 미처리, 누락 JS에 HTML을 반환하지 않음을 검증. 이는 실제 휴대폰 비행기 모드 시험을 대신하지 않음.
- 후속 커밋에서 위 테스트를 Pages 배포 전 자동 실행하도록 추가.
실제 사용자 Android/iPhone에서 설치와 비행기 모드 재실행은 원격으로 단정할 수 없습니다. 설치 후 오프라인 재실행 여부를 기기에서 최종 확인해야 합니다.
