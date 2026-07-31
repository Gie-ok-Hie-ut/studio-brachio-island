# Page Principles

이 사이트를 수정할 때 헷갈리지 않기 위한 공통 원칙입니다.

## 공통 구조

- 역할 페이지의 제목 영역은 `role-section-title` 구조를 따른다.
- 역할 이름과 닉네임의 타이포그래피는 공통 CSS에서만 조절한다.
- 역할 소개글은 반드시 `createRoleIntroNode()`가 만들고, CSS는 `.role-intro`만 사용한다.
- 역할 소개글을 위한 역할별 별칭 class를 새로 만들지 않는다. 위치 예외가 필요하면 부모 layout selector 아래에서 `.role-intro`를 조절한다.
- 역할별 본문 렌더링은 `ROLE_BODY_RENDERERS` registry에서만 추가한다. `renderRoleBody()`에 새 `if/else` 분기를 늘리지 않는다.
- 팝업 열기/닫기 상태 변경은 `openPopupModal()` / `closePopupModal()`을 통한다. Reader, PDF, Gallery마다 다른 것은 내용 렌더링과 정리 작업만 별도 함수에 둔다.

## 분리 구조

- 원본 CSS는 `versions/src/css/`, 원본 JS는 `versions/src/js/`에서 관리한다.
- 브라우저가 실제로 읽는 파일은 계속 `versions/version-15.css`와 `versions/version-15.js` 하나씩이다.
- `npm run build:assets`는 원본 partial을 합쳐 브라우저용 CSS/JS를 다시 만든다.
- `00-foundation.css`는 토큰, 폰트, 전역 base, legacy role panel shell만 둔다.
- `05-site-chrome.css`는 v15 메뉴, 언어 스위처, page transition chrome만 둔다.
- `10-role-layouts.css`는 공통 role detail, intro, CV/engineering list 구조를 둔다.
- `40-reader-and-popups.css`는 reader/PDF/gallery modal chrome과 popup 안쪽 media만 둔다.
- `60-home-signal.css`는 home landing과 Today's Signal만 둔다.
- `70-role-room.css`는 standalone room page(`body[data-role-room]`) 레이아웃과 room-only responsive 예외만 둔다.
- JS는 `70-role-pages.js`에 role shell/render/bind, `80-reader-modal.js`에 modal open/close와 PDF viewer, `90-markdown-reader.js`에 markdown/reader content rendering, `99-bootstrap.js`에 전역 이벤트 바인딩과 초기화만 둔다.
- `90-page-overrides.css`처럼 책임이 넓은 override 파일을 다시 만들지 않는다. 예외는 해당 기능 partial의 부모 selector 아래에 둔다.
- 분리된 selector도 공통 토큰(`--role-intro-font-size`, `--site-frame-width` 등)을 우선 사용한다.

## 반응형

- desktop/tablet/mobile 파일을 따로 만들지 않는다.
- 같은 CSS 안에서 base 스타일을 먼저 두고, `@media`로 화면 크기별 차이만 덮어쓴다.
- 모바일에서만 필요한 예외는 반드시 해당 컴포넌트 이름 아래에 둔다.

## 검증

- 수정 후 `npm run build:pages`로 CSS/JS와 HTML을 다시 생성한다.
- `node --check versions/version-15.js`, `node --check versions/src/js/*.js`, `npm run check`, `git diff --check`를 통과시킨다.
- 확인 페이지는 Home, Who We Are, AI Research, Novel, Visual Art, Essay를 모두 본다.
