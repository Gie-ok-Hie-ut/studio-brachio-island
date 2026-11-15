/* Creative Contribution Level: the creator's custom intention-to-expression scale.
 * Work-level assessments are self-reported metadata, never inferred from media. */
const creativeContributionName = "Creative Contribution Level";
const creativeContributionCopy = {
  en: {
    summary: "Level guide",
    descriptionPrefix: " is based on ",
    criterion: "how concretely the artist’s intention is realized in the work",
    description: ". It considers what is delegated to AI and what the artist directly decides and adjusts. Higher levels indicate that intention is more deeply reflected, from concept to detailed expression.",
    note: "Provisional assessments using the artist’s own criteria.",
    provisional: "Provisional assessment",
    source: "Background ↗",
    sourceTitle: "The Whole Artist and Vertical Art (Korean)",
    rows: [
      "Accept · Use an AI output without a specific intention",
      "Select · Choose a preferred result from multiple AI outputs",
      "Concept · Define the meaning and direction and reflect them in the work",
      "Composition · Design key elements, layout, and relationships and reflect them in the work",
      "Detail · Determine and adjust significant details, such as form, color, and texture",
      "Whole · Determine and realize the work’s key expressions as intended",
    ],
    definitions: [
      "Use an AI-generated output without a specific expressive intention.",
      "Choose a preferred result while leaving its particular expression to AI generation.",
      "Conceive the meaning, theme, and atmosphere and reflect them in the result.",
      "Design the key elements, composition, and relationships and reflect them in the result.",
      "Determine significant forms, colors, poses, and textures and adjust them toward the intended expression.",
      "Realize intention across the work’s key expressions; explain direct decisions and delegation, and adjust what needs to change.",
    ],
  },
  ko: {
    summary: "지표 설명",
    descriptionPrefix: "은 ",
    criterion: "창작자의 의도가 작품에 얼마나 구체적으로 구현되었는가",
    description: "를 기준으로 합니다. AI에 맡긴 부분과 창작자가 직접 결정·조정한 범위를 살피며, 높을수록 기획부터 세부 표현까지 의도가 깊게 반영되었음을 뜻합니다.",
    note: "작가 자체 기준에 따른 잠정 평가입니다.",
    provisional: "잠정 평가",
    source: "기준 배경 ↗",
    sourceTitle: "온전한 예술가와 직선적 예술",
    rows: [
      "수용 · 구체적인 의도 없이 AI 결과를 사용",
      "선별 · 여러 AI 결과 중 취향에 맞는 것을 선택",
      "개념 · 전달할 의미와 방향을 구상하고 결과에 반영",
      "구성 · 주요 요소·구도·관계를 설계하고 결과에 반영",
      "세부 · 중요한 형태·색·질감 등 세부 표현을 결정·조정",
      "전반 구현 · 핵심 표현 전반을 의도대로 결정·구현",
    ],
    definitions: [
      "구체적인 표현 의도 없이 AI가 생성한 결과를 그대로 사용합니다.",
      "여러 AI 결과 중 취향에 맞는 것을 고르며, 구체적인 표현은 AI 생성에 맡깁니다.",
      "전달할 의미·주제·분위기를 직접 구상하고 결과에 반영합니다.",
      "주요 요소와 배치, 구도, 요소 간 관계를 설계하고 결과에 반영합니다.",
      "중요한 형태·색·자세·질감을 결정하고, 의도와 다른 부분을 조정합니다.",
      "핵심 표현 전반을 의도대로 구현하며, 직접 결정과 위임의 이유를 설명하고 필요한 부분을 조정할 수 있습니다.",
    ],
  },
};

function getCreativeContributionFontText(lang) {
  const copy = creativeContributionCopy[lang === "ko" ? "ko" : "en"];
  return [`${creativeContributionName}(CCL)`, "CCL 0 1 2 3 4 5 3–4", copy.summary,
    copy.descriptionPrefix, copy.criterion, copy.description, copy.note, copy.source, ...copy.rows].join("\n");
}

function createCreativeContributionBadge(level, maximum = level, lang = getSiteLanguage()) {
  if (!Number.isInteger(level) || level < 0 || level > 5) return null;
  if (!Number.isInteger(maximum) || maximum < level || maximum > 5) return null;
  const copy = creativeContributionCopy[lang === "ko" ? "ko" : "en"];
  const label = maximum === level ? String(level) : `${level}–${maximum}`;
  const badge = document.createElement("span");
  badge.className = "ccl-badge";
  badge.textContent = `CCL ${label}`;
  badge.title = `${creativeContributionName} ${label} · ${copy.definitions[level]}`;
  badge.setAttribute("aria-label", `${creativeContributionName} ${label}`);
  return badge;
}

function appendWorkCreativeContribution(target, item, lang = getSiteLanguage()) {
  const meta = item?.meta || {};
  const badge = createCreativeContributionBadge(meta.creativeContributionLevel,
    meta.creativeContributionLevelMax ?? meta.creativeContributionLevel, lang);
  if (!badge) return;
  const copy = creativeContributionCopy[lang === "ko" ? "ko" : "en"];
  const wrapper = document.createElement("span");
  wrapper.className = "ccl-work-meta";
  if (meta.creativeContributionStatus === "provisional") {
    badge.title += ` · ${copy.provisional}`;
    badge.setAttribute("aria-label", `${badge.getAttribute("aria-label")} · ${copy.provisional}`);
    wrapper.dataset.cclStatus = "provisional";
  }
  wrapper.append(badge);
  const context = document.createElement("span");
  context.className = "ccl-context-text";
  context.append(...target.childNodes);
  target.classList.add("ccl-context");
  target.append(context, wrapper);
}

function createCreativeContributionDisclosure(roleId) {
  const copy = creativeContributionCopy[getSiteLanguage()];
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  const label = document.createElement("span");
  const hint = document.createElement("span");
  const content = document.createElement("div");
  const name = document.createElement("strong");
  const criterion = document.createElement("strong");
  const description = document.createElement("p");
  const table = document.createElement("table");
  const rows = table.createTBody();
  const source = document.createElement("a");

  details.className = "ccl-disclosure";
  details.open = document.querySelector(`[data-ccl-role="${roleId}"]`)?.open || false;
  details.dataset.cclRole = roleId;
  label.className = "ccl-label";
  label.textContent = "CCL";
  hint.className = "ccl-hint";
  hint.textContent = copy.summary;
  summary.append(label, hint);
  content.className = "ccl-content";
  name.className = "ccl-name";
  name.textContent = `${creativeContributionName}(CCL)`;
  criterion.textContent = copy.criterion;
  description.className = "ccl-description";
  description.append(name, document.createTextNode(copy.descriptionPrefix), criterion,
    document.createTextNode(`${copy.description} ${copy.note} `));
  table.className = "ccl-table";
  table.setAttribute("aria-label", `${creativeContributionName} 0–5`);
  copy.rows.forEach((text, index) => {
    const row = rows.insertRow();
    const level = document.createElement("th");
    const cell = document.createElement("td");
    level.scope = "row";
    level.append(createCreativeContributionBadge(index));
    cell.textContent = text;
    cell.title = copy.definitions[index];
    row.append(level, cell);
  });
  source.className = "ccl-source";
  source.textContent = copy.source;
  source.title = copy.sourceTitle;
  source.href = "essay.html#pdf=complete-artist-linear-art";
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  description.append(source);
  content.append(description, table);
  details.append(summary, content);
  details.addEventListener("toggle", () => {
    if (details.isConnected && roleId === "novel") requestAnimationFrame(positionNovelOrbitCards);
  });
  return details;
}
