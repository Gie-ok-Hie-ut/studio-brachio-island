# Page Principles

이 사이트를 수정할 때 헷갈리지 않기 위한 공통 원칙입니다.

## 공통 구조

- 사용자에게 보이는 내용은 markdown/frontmatter에 명시한다. JS는 내용을 숨겨서 자동 주입하지 않고, markdown에 적힌 구조를 렌더링만 한다.
- CV형 섹션(`Career`, `Education`, `Projects`, `Paper`, `Article / Media`)은 `content/role/01-ai-engineer.md` 안의 markdown table을 단일 편집 표면으로 삼는다.
- CV table은 `Label/Date/Year`, `Title`, `Detail`, `Links` 열을 기본으로 한다. `Detail`은 제목 아래에, `Links`는 오른쪽 액션 영역에 렌더링한다.
- CV table 안의 링크, 강조, 줄바꿈(`<br>`), 밑줄(`<u>...</u>`)은 markdown에 적힌 위치와 의도를 따른다.
- `Projects`와 `Paper`처럼 화면에 보이는 섹션을 비워 둔 뒤 JS가 별도 content collection을 끼워 넣는 구조를 만들지 않는다.
- 역할 페이지의 제목 영역은 `role-section-title` 구조를 따른다.
- 역할 이름과 닉네임의 타이포그래피는 공통 CSS에서만 조절한다.
- 역할 소개글은 반드시 `createRoleIntroNode()`가 만들고, 기본 타이포그래피는 `.role-intro`에서만 조절한다.
- 역할 상단 소개 블록은 반드시 `createRoleOverviewNode()` / `appendRoleOverview()`가 만들고, 흐름은 `.role-overview-stack`, 폭은 `.role-overview`에서만 조절한다.
- 역할 소개글을 위한 역할별 별칭 class를 새로 만들지 않는다. 위치 예외가 필요하면 부모 layout selector 아래에서 `.role-intro`를 조절한다.
- AI Research, Novel, Visual Art, Essay의 상단 소개 영역은 공통 `.role-overview-stack > .role-overview` 구조를 사용한다. Essay처럼 소개글이 비어 있는 경우에는 빈 spacer를 만들지 않고 첫 본문이 같은 flow 기준으로 올라온다.
- 역할 페이지의 화면 크기별 title/handle/intro 크기와 breakpoint는 `70-role-room.css`의 공통 role-room 기준에서 먼저 조절한다. 개별 역할 CSS는 콘텐츠/미디어 배치가 실제로 다른 경우에만 최소 보정한다.
- 긴 role handle은 `//` 원문 줄바꿈을 보존하되, 넓은 모바일에서는 `createRoleHeading()`이 만든 `data-handle-flat`을 사용해 한 줄 표시를 허용한다.
- 역할별 본문 렌더링은 `ROLE_BODY_RENDERERS` registry에서만 추가한다. `renderRoleBody()`에 새 `if/else` 분기를 늘리지 않는다.
- 팝업 열기/닫기 상태 변경은 `openPopupModal()` / `closePopupModal()`을 통한다. Reader, PDF, Gallery마다 다른 것은 내용 렌더링과 정리 작업만 별도 함수에 둔다.

## 분리 구조

- 원본 CSS는 `versions/src/css/`, 원본 JS는 `versions/src/js/`에서 관리한다.
- 브라우저가 실제로 읽는 파일은 계속 `versions/version-15.css`와 `versions/version-15.js` 하나씩이다.
- `npm run build:assets`는 원본 partial을 합쳐 브라우저용 CSS/JS를 다시 만든다.
- `00-foundation.css`는 토큰, 폰트, 전역 base, legacy role panel shell만 둔다.
- `05-site-chrome.css`는 v15 메뉴, 언어 스위처, page transition chrome만 둔다.
- `10-role-layouts.css`는 공통 role detail, intro, CV/engineering list 구조를 둔다.
- `.role-detail`, `.role-section-title`, `.role-profile-links`, `.role-section-body` 같은 role shell 기본값은 `10-role-layouts.css`에 둔다.
- Role body의 스크롤 동작과 보이는 scrollbar는 `.role-scroll-region`에서만 관리한다. 개별 역할 CSS에서 같은 overflow를 다시 선언하거나 scrollbar를 숨기지 않는다.
- `role-items`는 CV/Essay 같은 리스트형 항목에만 쓴다. Visual Art masonry gallery에는 붙이지 않는다.
- `40-popup-shell.css`는 `popup-*` 공통 modal shell, toolbar, action chrome, PDF frame/fallback만 둔다.
- 팝업 DOM/CSS class는 `popup-*` shell과 `popup-window-reader/pdf/gallery` variant만 사용한다. `reader-window`, `pdf-toolbar` 같은 이전 alias class를 다시 만들지 않는다.
- `41-reader-content.css`는 reader markdown, Notion-style content, reader scroll 표시만 둔다.
- `42-gallery-popup.css`는 gallery popup window variant, gallery media/detail, full-size original viewer만 둔다.
- `60-home-signal.css`는 home landing과 Today's Signal만 둔다.
- `70-role-room.css`는 standalone room page(`body[data-role-room]`) 공통 shell, title/handle, page-level responsive만 둔다.
- `71-role-room-variants.css`는 standalone room page 안에서만 필요한 Novel, Visual Art, AI Research, Essay 역할별 예외만 둔다.
- JS는 `20-reader-state.js`에 reader/popup mutable state, `21-content-lookup.js`에 content/path/localized field lookup, `22-popup-url-and-share.js`에 popup hash/share, `23-localization-refresh.js`에 language switch refresh, `24-reader-scroll-and-history.js`에 reader scroll/back history만 둔다.
- JS는 `50-role-common.js`에 role 공통 helper만 둔다. Gallery, Novel, Essay, CV 어디서나 쓰는 role heading, meta text, profile icon, role item button 생성은 여기서 관리한다.
- JS는 `30-novel.js`에 Novel 카드/오빗/그리드 동작만 두고, `40-gallery.js`에는 Gallery asset/project/rendering만 둔다.
- JS는 `70-role-pages.js`에 role shell/render/bind, `80-reader-modal.js`에 modal open/close와 PDF viewer, `90-markdown-reader.js`에 markdown/reader content rendering, `99-bootstrap.js`에 전역 이벤트 바인딩과 초기화만 둔다.
- `50-responsive.css`, `90-page-overrides.css`처럼 책임이 넓은 override 파일을 다시 만들지 않는다. 반응형 예외도 해당 기능 partial의 부모 selector 아래에 둔다.
- 분리된 selector도 공통 토큰(`--role-intro-font-size`, `--site-frame-width` 등)을 우선 사용한다.
- Reader 스크롤은 실제 스크롤 컨테이너 `.popup-content-reader`와 표시 UI `.reader-scroll-indicator` 하나로 유지한다. Native scrollbar를 다시 노출하지 않는다.

## 반응형

- desktop/tablet/mobile 파일을 따로 만들지 않는다.
- 같은 CSS 안에서 base 스타일을 먼저 두고, `@media`로 화면 크기별 차이만 덮어쓴다.
- 모바일에서만 필요한 예외는 반드시 해당 컴포넌트 이름 아래에 둔다.

## 검증

- 수정 후 `npm run build:pages`로 CSS/JS와 HTML을 다시 생성한다.
- `node --check versions/version-15.js`, `node scripts/check-js-source.js`, `node scripts/check-asset-structure.js`, `npm run check`, `git diff --check`를 통과시킨다.
- 확인 페이지는 Home, Who We Are, AI Research, Novel, Visual Art, Essay를 모두 본다.
