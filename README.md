# 복지시험 AI 코치 MAX

사회복지사 1급 + 2027 지방직 9급 사회복지직 학습 PWA입니다.

## GitHub Pages 배포
1. 저장소 Settings → Pages → Source를 **GitHub Actions**로 설정합니다.
2. `main` 브랜치에 push하면 `.github/workflows/deploy-pages.yml`이 자동 빌드/배포합니다.
3. 배포 후 갤럭시 Chrome에서 주소를 열고 **앱 설치 / 홈 화면에 추가**를 선택합니다.

## GitHub Pages 버전 차이
- 문제풀이, 오답노트, 1·3·7일 복습, 분석, 암기카드, 기출유형 학습, PWA 오프라인 캐시는 브라우저에서 동작합니다.
- Manus 서버에 의존하던 AI API는 GitHub Pages에서 사용할 수 없으므로 **오프라인 스마트해설**로 대체했습니다.
- 실제 AI 생성형 해설이 필요하면 Manus 배포 주소를 유지하거나 별도 백엔드 API를 연결해야 합니다.

## 앱 소스 (`app/`)
Manus에서 내보낸 전체 앱 소스(React/Vite 클라이언트 + Express 서버 + Drizzle)가 `app/` 디렉터리에 있습니다. 루트의 `index.html`·`manifest.webmanifest`·`sw.js`는 GitHub Pages에 배포되는 얇은 iframe 래퍼이며 이번 변경으로 건드리지 않았습니다.

`app/client/src/data/bank.json`의 문제은행을 보강했습니다.
- 사회복지사 1급: 8과목 × 1문항(총 8문항) → 8과목 × 16문항(총 128문항)
- 지방직 9급 문제(125문항)는 기존과 동일합니다.

앱 소스를 직접 실행하려면 `app/` 디렉터리에서 `pnpm install` 후 `pnpm dev`를 사용하세요.
