# Page Principles

이 사이트를 수정할 때 헷갈리지 않기 위한 공통 원칙입니다.

## 공통 구조

- 역할 페이지의 제목 영역은 `role-section-title` 구조를 따른다.
- 역할 이름과 닉네임의 타이포그래피는 공통 CSS에서만 조절한다.
- 역할 소개글은 반드시 `createRoleIntroNode()`가 만들고, CSS는 `.role-intro`만 사용한다.
- `cv-intro`, `visual-role-intro`처럼 역할별 소개글 별칭을 새로 만들지 않는다.

## 분리 구조

- 공통 레이아웃, 폰트, 팝업 툴바, 버튼 스타일은 `versions/version-15.css`와 `versions/version-15.js`에서 관리한다.
- AI Research, Novel, Visual Art처럼 동작이 다른 영역만 role-specific 함수와 CSS selector로 분리한다.
- 분리된 selector도 공통 토큰(`--role-intro-font-size`, `--site-shell-width` 등)을 우선 사용한다.

## 반응형

- desktop/tablet/mobile 파일을 따로 만들지 않는다.
- 같은 CSS 안에서 base 스타일을 먼저 두고, `@media`로 화면 크기별 차이만 덮어쓴다.
- 모바일에서만 필요한 예외는 반드시 해당 컴포넌트 이름 아래에 둔다.

## 검증

- 수정 후 `npm run build:pages`로 HTML을 다시 생성한다.
- `node --check versions/version-15.js`, `npm run check`, `git diff --check`를 통과시킨다.
- 확인 페이지는 Home, Who We Are, AI Research, Novel, Visual Art, Essay를 모두 본다.
