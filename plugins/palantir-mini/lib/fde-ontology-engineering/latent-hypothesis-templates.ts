import type {
  LatentIntentFamily,
  LatentIntentHypothesis,
} from "./types";

export interface LatentHypothesisTemplate {
  readonly templateId: string;
  readonly family: LatentIntentFamily;
  readonly decisionAxis: LatentIntentHypothesis["decisionAxis"];
  readonly readinessRequirementIds: readonly string[];
  readonly possibleObjects: readonly string[];
  readonly possibleLinks: readonly string[];
  readonly possibleActions: readonly string[];
  readonly possibleFunctions: readonly string[];
  readonly evidenceNeeded: readonly string[];
  readonly plainLanguage: (summary: string) => string;
  readonly whyLeadInferredThis: string;
  readonly whatUserMayNotHaveNoticed: string;
  readonly recommendedDefault: string;
  readonly riskIfWrong: string;
  readonly whatWillNotHappenIfAccepted: readonly string[];
}

export const LATENT_HYPOTHESIS_TEMPLATES = {
  thinkingStepEvidenceBeforeMastery: {
    templateId: "latent-template:thinking-step-evidence-before-mastery",
    family: "math-thinking-evidence",
    decisionAxis: "data",
    readinessRequirementIds: ["evidence", "latent-intent-decision", "evidence-classification"],
    possibleObjects: ["ProblemSolvingMove", "ReasoningEvidence", "StudentMastery"],
    possibleLinks: ["ReasoningEvidence supports ProblemSolvingMove"],
    possibleActions: [],
    possibleFunctions: ["classifyThinkingStep"],
    evidenceNeeded: [
      "observable student solving step",
      "reasoning evidence before mastery judgment",
    ],
    plainLanguage: (summary) =>
      `You likely want to see where the student is stuck before deciding mastery: ${summary}`,
    whyLeadInferredThis:
      "The turn asks to observe where a student is stuck, how they reason, or what solving step is visible.",
    whatUserMayNotHaveNoticed:
      "Mastery is a later judgment; the first ontology boundary should capture observable thinking-step evidence.",
    recommendedDefault:
      "Start with ProblemSolvingMove and ReasoningEvidence, and defer StudentMastery until evidence is defined.",
    riskIfWrong:
      "The system could label mastery from fluent output instead of grounded student reasoning evidence.",
    whatWillNotHappenIfAccepted: [
      "Accepting this hypothesis will not grade the student.",
      "Accepting this hypothesis will not publish student-facing feedback.",
      "Accepting this hypothesis will not authorize writeback.",
    ],
  },
  explanationLabelBeforeGeneration: {
    templateId: "latent-template:explanation-label-before-generation",
    family: "instructional-explanation-quality",
    decisionAxis: "logic",
    readinessRequirementIds: ["evidence", "latent-intent-decision", "non-goals"],
    possibleObjects: ["ExplanationMove", "BoardworkMove", "LabelSpec", "ValidationPack"],
    possibleLinks: ["ExplanationMove validatedBy ValidationPack"],
    possibleActions: ["draftLabelSpec", "validateExplanationLogic"],
    possibleFunctions: ["gradeExplanationCoherence"],
    evidenceNeeded: [
      "sample explanation",
      "boardwork sequence",
      "teacher intended learning point",
    ],
    plainLanguage: (summary) =>
      `You likely want AI to generate better explanations, but first label what makes an explanation good: ${summary}`,
    whyLeadInferredThis:
      "The turn mentions AI-generated explanations, lecture structure, boardwork, or explanation flow.",
    whatUserMayNotHaveNoticed:
      "Without LabelSpec and ValidationPack, generation can imitate style without knowing why an explanation is educationally valid.",
    recommendedDefault:
      "Start with ExplanationMove, BoardworkMove, LabelSpec, and ValidationPack before generating lessons or videos.",
    riskIfWrong:
      "If generation comes before labels and validation, output may be fluent but pedagogically weak.",
    whatWillNotHappenIfAccepted: [
      "Accepting this hypothesis will not publish student-facing material.",
      "Accepting this hypothesis will not open a video generation pipeline.",
      "Accepting this hypothesis will not start frontend or backend implementation.",
    ],
  },
  mypObjectiveAlignmentReferenceNotSsot: {
    templateId: "latent-template:MYP-objective-alignment-is-reference-not-SSoT",
    family: "curriculum-reference-boundary",
    decisionAxis: "governance",
    readinessRequirementIds: ["evidence-classification", "non-goals", "latent-intent-decision"],
    possibleObjects: ["CurriculumReference", "MYPObjective", "AssessmentCriterion"],
    possibleLinks: ["CurriculumReference supports OntologyDecision"],
    possibleActions: [],
    possibleFunctions: [],
    evidenceNeeded: [
      "reference_only/not_promoted curriculum classification",
      "approved promotion decision if used as authority",
    ],
    plainLanguage: (summary) =>
      `Use MYP objectives as reference evidence, not as the local ontology SSoT unless promoted: ${summary}`,
    whyLeadInferredThis:
      "The turn names MYP objectives, criteria A-D, IB curriculum, rubric, or assessment alignment.",
    whatUserMayNotHaveNoticed:
      "MYP criteria can guide review without becoming the authority that controls SIC, DTC, or runtime behavior.",
    recommendedDefault:
      "Keep MYP objective alignment as reference_only/not_promoted evidence until a contract explicitly promotes it.",
    riskIfWrong:
      "Curriculum language could silently become mutation authority without user approval or scoped evidence promotion.",
    whatWillNotHappenIfAccepted: [
      "Accepting this hypothesis will not promote MYP docs to SSoT.",
      "Accepting this hypothesis will not widen ontology authority.",
      "Accepting this hypothesis will not authorize mutation.",
    ],
  },
  realLifeContextBefore3dRuntime: {
    templateId: "latent-template:real-life-context-before-3D-runtime",
    family: "technology-surface",
    decisionAxis: "application-state",
    readinessRequirementIds: ["mission", "evidence", "latent-intent-decision", "application-state"],
    possibleObjects: ["RealLifeContext", "ActivityScenario", "Scene3D"],
    possibleLinks: ["Scene3D represents RealLifeContext"],
    possibleActions: ["ReviewRuntimeState"],
    possibleFunctions: ["validateContextFit"],
    evidenceNeeded: ["real-life context definition", "evidence capture surface", "3D runtime validation"],
    plainLanguage: (summary) =>
      `Before building a 3D activity, name the real-life context and evidence the scene must capture: ${summary}`,
    whyLeadInferredThis:
      "The turn mentions 3D activity, scene, renderer, real-life context, application, or interactive runtime.",
    whatUserMayNotHaveNoticed:
      "A 3D scene is not the semantic owner; it is a runtime surface for an approved learning context.",
    recommendedDefault:
      "Define RealLifeContext and evidence capture before opening 3D runtime implementation.",
    riskIfWrong:
      "The runtime could optimize for impressive visuals while missing the educational context and evidence boundary.",
    whatWillNotHappenIfAccepted: [
      "Accepting this hypothesis will not add a renderer dependency.",
      "Accepting this hypothesis will not implement a 3D runtime.",
      "Accepting this hypothesis will not publish student-facing output.",
    ],
  },
  communicationCriterionBeforeVideoOutput: {
    templateId: "latent-template:communication-criterion-before-video-output",
    family: "instructional-explanation-quality",
    decisionAxis: "logic",
    readinessRequirementIds: ["evidence", "evaluation", "latent-intent-decision"],
    possibleObjects: ["CommunicationCriterion", "ExplanationMove", "VideoOutput"],
    possibleLinks: ["VideoOutput evaluatedBy CommunicationCriterion"],
    possibleActions: ["validateExplanationLogic"],
    possibleFunctions: ["gradeCommunicationClarity"],
    evidenceNeeded: ["communication criterion", "sample explanation", "validation rubric"],
    plainLanguage: (summary) =>
      `Before producing video output, define the communication criterion that makes the explanation acceptable: ${summary}`,
    whyLeadInferredThis:
      "The turn mentions video, lecture output, communication quality, explanation clarity, or student-facing media.",
    whatUserMayNotHaveNoticed:
      "Video output can look polished while failing the communication criterion that should be evaluated first.",
    recommendedDefault:
      "Define CommunicationCriterion and ValidationPack before creating or publishing video output.",
    riskIfWrong:
      "The system could produce polished media that is hard to verify educationally.",
    whatWillNotHappenIfAccepted: [
      "Accepting this hypothesis will not generate video.",
      "Accepting this hypothesis will not publish student-facing media.",
      "Accepting this hypothesis will not bypass validation.",
    ],
  },
  actionWritebackRequiresSubmissionCriteria: {
    templateId: "latent-template:action-writeback-requires-submission-criteria",
    family: "action-writeback-design",
    decisionAxis: "action",
    readinessRequirementIds: ["action", "submission-criteria", "governance"],
    possibleObjects: ["SubmissionCriterion", "ActionWriteback"],
    possibleLinks: ["ActionWriteback requires SubmissionCriterion"],
    possibleActions: ["proposeActionWriteback"],
    possibleFunctions: ["validateSubmissionCriteria"],
    evidenceNeeded: ["submission criteria", "approval boundary", "writeback risk classification"],
    plainLanguage: (summary) =>
      `Any action/writeback needs submission criteria before it can be proposed: ${summary}`,
    whyLeadInferredThis:
      "The turn mentions action, writeback, update, submit, commit, publish, approve, or student result changes.",
    whatUserMayNotHaveNoticed:
      "An ActionType is not just a button; it needs submission criteria and approval before mutation.",
    recommendedDefault:
      "Keep action/writeback deferred until SubmissionCriterion, approval, and risk closure are explicit.",
    riskIfWrong:
      "The system could mutate state or publish outcomes without a reviewable submission boundary.",
    whatWillNotHappenIfAccepted: [
      "Accepting this hypothesis will not execute writeback.",
      "Accepting this hypothesis will not commit or publish changes.",
      "Accepting this hypothesis will not bypass DTC approval.",
    ],
  },
  studentFacingOutputRequiresApprovalAndEval: {
    templateId: "latent-template:student-facing-output-requires-approval-and-eval",
    family: "governance-eval-design",
    decisionAxis: "governance",
    readinessRequirementIds: ["evaluation", "governance", "submission-criteria"],
    possibleObjects: ["StudentFacingOutput", "ValidationPack", "ApprovalRecord"],
    possibleLinks: ["StudentFacingOutput requires ApprovalRecord"],
    possibleActions: ["requestStudentFacingApproval"],
    possibleFunctions: ["evaluateStudentFacingOutput"],
    evidenceNeeded: ["human approval", "validation pack", "student-facing risk checklist"],
    plainLanguage: (summary) =>
      `Student-facing output requires explicit approval and eval before publish: ${summary}`,
    whyLeadInferredThis:
      "The turn mentions student-facing material, handout, answer, feedback, publish, or output for learners.",
    whatUserMayNotHaveNoticed:
      "Student-facing output is a publish boundary, not just a draft artifact.",
    recommendedDefault:
      "Require human approval, ValidationPack, and DTC publish boundary before student-facing output.",
    riskIfWrong:
      "The system could expose unvalidated or pedagogically weak material to students.",
    whatWillNotHappenIfAccepted: [
      "Accepting this hypothesis will not publish student-facing output.",
      "Accepting this hypothesis will not generate final learner material.",
      "Accepting this hypothesis will not bypass human approval or eval.",
    ],
  },
  chatbotApplicationStateBeforePersonalization: {
    templateId: "latent-template:chatbot-studio.application-state-first",
    family: "chatbot-studio-design",
    decisionAxis: "application-state",
    readinessRequirementIds: ["application-state", "evidence", "latent-intent-decision"],
    possibleObjects: ["ChatbotApplicationState", "RetrievalContext", "UserDecision"],
    possibleLinks: ["ChatbotApplicationState scopes RetrievalContext"],
    possibleActions: ["requestClarification"],
    possibleFunctions: ["resolveDeterministicContext"],
    evidenceNeeded: [
      "application state variable",
      "retrieval context source",
      "user decision boundary",
    ],
    plainLanguage: (summary) =>
      `Chatbot Studio personalization needs deterministic application state before runtime behavior changes: ${summary}`,
    whyLeadInferredThis:
      "The turn names Chatbot Studio, retrieval context, application state, or personalized assistant behavior.",
    whatUserMayNotHaveNoticed:
      "A context-aware chatbot can change decision flow even when it is only reading ontology or document context.",
    recommendedDefault:
      "Name ChatbotApplicationState and RetrievalContext first, then keep user decisions explicit before DTC.",
    riskIfWrong:
      "The assistant could appear to personalize guidance without a reviewable state boundary.",
    whatWillNotHappenIfAccepted: [
      "Accepting this hypothesis will not publish chatbot behavior.",
      "Accepting this hypothesis will not perform writeback.",
      "Accepting this hypothesis will not bypass DTC approval.",
    ],
  },
  koreanEducationInstructionQuality: {
    templateId: "latent-template:korean-education.instruction-quality",
    family: "instructional-explanation-quality",
    decisionAxis: "logic",
    readinessRequirementIds: ["mission", "evidence", "latent-intent-decision"],
    possibleObjects: ["Learner", "Lesson", "ExplanationEvidence"],
    possibleLinks: ["LearnerUnderstandsLesson"],
    possibleActions: [],
    possibleFunctions: ["EvaluateExplanationQuality"],
    evidenceNeeded: ["student-visible reasoning evidence", "teacher-visible explanation rubric"],
    plainLanguage: (summary) =>
      `Clarify the Korean education explanation-quality decision before modeling learner evidence: ${summary}`,
    whyLeadInferredThis:
      "The turn uses Korean education language and asks about explanation, learning, student, teacher, or assessment quality.",
    whatUserMayNotHaveNoticed:
      "Instruction quality is a decision about learner-visible evidence and teacher review, not just a generic ontology object.",
    recommendedDefault:
      "Keep the instruction-quality hypothesis deferred until the learner evidence and teacher review boundary are explicit.",
    riskIfWrong:
      "The system could optimize for generic content generation instead of the instructional reasoning evidence the educator needs.",
    whatWillNotHappenIfAccepted: [
      "Accepting this hypothesis will not replace teacher judgment.",
      "Accepting this hypothesis will not authorize grading or writeback actions.",
      "Raw Korean prompt text will not be persisted.",
    ],
  },
  mypCurriculumReferenceBoundary: {
    templateId: "latent-template:myp.curriculum-reference-boundary",
    family: "curriculum-reference-boundary",
    decisionAxis: "governance",
    readinessRequirementIds: ["evidence-classification", "non-goals", "latent-intent-decision"],
    possibleObjects: ["CurriculumReference", "AssessmentCriterion"],
    possibleLinks: ["ReferenceSupportsDecision"],
    possibleActions: [],
    possibleFunctions: [],
    evidenceNeeded: ["reference_only/not_promoted evidence classification", "promotion decision owner"],
    plainLanguage: (summary) =>
      `Keep MYP/curriculum material as reference evidence unless an approved contract promotes it: ${summary}`,
    whyLeadInferredThis:
      "The turn names MYP, IB, curriculum, criterion, rubric, or unit material that can look authoritative before promotion.",
    whatUserMayNotHaveNoticed:
      "Curriculum references can support an ontology decision without becoming the ontology authority.",
    recommendedDefault:
      "Classify curriculum material as reference_only/not_promoted until the user approves promotion.",
    riskIfWrong:
      "A later contract could silently promote curriculum guidance into runtime authority outside the approved boundary.",
    whatWillNotHappenIfAccepted: [
      "Accepting this hypothesis will not promote MYP or curriculum docs to authority.",
      "Accepting this hypothesis will not widen the approved ontology scope.",
      "Accepting this hypothesis will not start a mutation path.",
    ],
  },
  frontendRuntimeSurface: {
    templateId: "latent-template:frontend.runtime-surface",
    family: "technology-surface",
    decisionAxis: "application-state",
    readinessRequirementIds: ["mission", "latent-intent-decision", "application-state"],
    possibleObjects: ["RuntimeSurface", "WorkbenchView"],
    possibleLinks: [],
    possibleActions: ["ReviewRuntimeState"],
    possibleFunctions: ["ProjectRuntimeRecommendation"],
    evidenceNeeded: ["runtime surface evidence", "validation command"],
    plainLanguage: (summary) =>
      `Name the frontend/runtime surface and keep it review-only until DTC approval: ${summary}`,
    whyLeadInferredThis:
      "The turn names a frontend, UI, card, panel, workbench, component, runtime, or view surface.",
    whatUserMayNotHaveNoticed:
      "A visible surface can change application state semantics even when no backend object type changes.",
    recommendedDefault:
      "Treat the runtime surface as a review surface until SIC/DTC refs approve a mutation boundary.",
    riskIfWrong:
      "The card or panel could appear to authorize a runtime change when it is only surfacing review state.",
    whatWillNotHappenIfAccepted: [
      "Accepting this hypothesis will not authorize UI or backend mutation.",
      "Accepting this hypothesis will not register a public MCP tool.",
      "Accepting this hypothesis will not claim hook parity without smoke evidence.",
    ],
  },
  threeDimensionalRuntimeSurface: {
    templateId: "latent-template:runtime.3d-surface",
    family: "technology-surface",
    decisionAxis: "application-state",
    readinessRequirementIds: ["mission", "latent-intent-decision", "application-state"],
    possibleObjects: ["RuntimeSurface", "Scene3D"],
    possibleLinks: ["SceneRendersObject"],
    possibleActions: ["ReviewRuntimeState"],
    possibleFunctions: ["ProjectRuntimeRecommendation"],
    evidenceNeeded: ["3D runtime surface evidence", "viewport/render validation command"],
    plainLanguage: (summary) =>
      `Separate the UI/3D runtime surface from mutation authority before approving implementation: ${summary}`,
    whyLeadInferredThis:
      "The turn names 3D, canvas, scene, renderer, WebGL, Three.js, viewport, or runtime UI behavior.",
    whatUserMayNotHaveNoticed:
      "3D rendering choices can create a separate application-state boundary from ontology mutation.",
    recommendedDefault:
      "Keep 3D runtime behavior as an explicit review surface until the DTC names the render boundary.",
    riskIfWrong:
      "The implementation could widen a 2D/runtime contract or add renderer behavior without an approved boundary.",
    whatWillNotHappenIfAccepted: [
      "Accepting this hypothesis will not add a renderer dependency.",
      "Accepting this hypothesis will not widen an existing 2D scene contract.",
      "Accepting this hypothesis will not authorize project mutation from a card.",
    ],
  },
  materialsDataAuthority: {
    templateId: "latent-template:materials.data-authority",
    family: "data-authority",
    decisionAxis: "data",
    readinessRequirementIds: ["evidence", "evidence-classification", "non-goals"],
    possibleObjects: ["SourceMaterial", "EvidenceArtifact"],
    possibleLinks: ["MaterialSupportsDecision"],
    possibleActions: [],
    possibleFunctions: [],
    evidenceNeeded: ["source authority classification"],
    plainLanguage: (summary) =>
      `Classify source materials before treating them as ontology authority: ${summary}`,
    whyLeadInferredThis:
      "The turn names materials, worksheets, slides, documents, source artifacts, references, or Korean source-material terms.",
    whatUserMayNotHaveNoticed:
      "A source artifact can be evidence without being promoted into the ontology authority layer.",
    recommendedDefault:
      "Keep materials as evidence until the source authority and non-goals are explicit.",
    riskIfWrong:
      "The runtime could treat a supporting artifact as canonical authority.",
    whatWillNotHappenIfAccepted: [
      "Accepting this hypothesis will not promote source material to authority.",
      "Accepting this hypothesis will not persist raw prompt text.",
    ],
  },
  genericPromptMissionDecision: {
    templateId: "latent-template:generic.prompt-mission-decision",
    family: "mission-decision",
    decisionAxis: "governance",
    readinessRequirementIds: ["mission", "latent-intent-decision"],
    possibleObjects: ["MissionDecision"],
    possibleLinks: [],
    possibleActions: ["ConfirmIntent"],
    possibleFunctions: [],
    evidenceNeeded: ["accepted mission decision"],
    plainLanguage: (summary) =>
      `Confirm the operational mission decision before drafting contracts: ${summary}`,
    whyLeadInferredThis:
      "The turn asks about prompt meaning, mission, intent, clarification, questions, or decisions.",
    whatUserMayNotHaveNoticed:
      "A mission decision must be accepted before the SIC can safely name objects, actions, or runtime surfaces.",
    recommendedDefault:
      "Defer contract drafting until the mission decision is explicit.",
    riskIfWrong:
      "A later SemanticIntentContract could encode the wrong operational decision.",
    whatWillNotHappenIfAccepted: [
      "Accepting this hypothesis will not bypass SIC/DTC approval.",
      "Accepting this hypothesis will not authorize mutation.",
    ],
  },
  /**
   * DP-5: the generic per-`"draft"`-axis confirmation-debt template. The session
   * derivation proposes each axis as a `"draft"` (NEVER `"filled"` — only the 9-axis
   * turn engine mints `"filled"`); every unconfirmed draft is standing confirmation
   * debt the user has not yet confirmed. This template supplies the STABLE boilerplate
   * (the plain-language framing + the non-authorization disclaimers); the derivation
   * (`deriveDraftAxisConfirmationDebt` in `sic-from-session.ts`) overrides the per-axis
   * `family` / `decisionAxis` / `readinessRequirementIds` / `riskIfWrong` (facet-bound)
   * from the draft axis it describes. Reuses the existing template-instantiation path —
   * no new machinery, no new `LatentIntentFamily` / `decisionAxis` member.
   */
  draftAxisConfirmationDebt: {
    templateId: "latent-template:draft-axis-confirmation-debt",
    family: "framework-discovery",
    decisionAxis: "data",
    readinessRequirementIds: ["latent-intent-decision"],
    possibleObjects: [],
    possibleLinks: [],
    possibleActions: [],
    possibleFunctions: [],
    evidenceNeeded: ["per-axis user confirmation (the axis turn)"],
    plainLanguage: (summary) =>
      `Proposed for this axis but not yet user-confirmed: ${summary}`,
    whyLeadInferredThis:
      "The session produced a draft proposal for this axis from accepted session signal, but the 9-axis turn engine has not yet confirmed it.",
    whatUserMayNotHaveNoticed:
      "A draft axis is a proposal awaiting confirmation; until the axis turn fills it, it carries standing confirmation debt and cannot authorize the mutation it implies.",
    recommendedDefault:
      "Confirm or revise the axis at its 9-axis turn before any DTC synthesis or registration relies on it.",
    riskIfWrong:
      "An unconfirmed axis could authorize a mutation the user never approved.",
    whatWillNotHappenIfAccepted: [
      "Surfacing this confirmation debt will not authorize ontology mutation.",
      "Surfacing this confirmation debt will not confirm the axis on the user's behalf.",
      "Surfacing this confirmation debt will not persist raw prompt text.",
    ],
  },
} as const satisfies Record<string, LatentHypothesisTemplate>;

export function instantiateLatentHypothesisTemplate(input: {
  readonly template: LatentHypothesisTemplate;
  readonly summary: string;
  readonly evidenceNeeded?: readonly string[];
  readonly sourceRefs?: readonly string[];
  readonly possibleObjects?: readonly string[];
  readonly possibleLinks?: readonly string[];
  readonly possibleActions?: readonly string[];
  readonly possibleFunctions?: readonly string[];
}): Omit<
  LatentIntentHypothesis,
  "hypothesisId" | "status" | "ruleId" | "confidence"
> {
  return {
    templateId: input.template.templateId,
    family: input.template.family,
    decisionAxis: input.template.decisionAxis,
    readinessRequirementIds: input.template.readinessRequirementIds,
    plainLanguage: input.template.plainLanguage(input.summary),
    whyLeadInferredThis: input.template.whyLeadInferredThis,
    whatUserMayNotHaveNoticed: input.template.whatUserMayNotHaveNoticed,
    recommendedDefault: input.template.recommendedDefault,
    riskIfWrong: input.template.riskIfWrong,
    whatWillNotHappenIfAccepted: input.template.whatWillNotHappenIfAccepted,
    ontologyImplication: {
      possibleObjects: input.possibleObjects ?? input.template.possibleObjects,
      possibleLinks: input.possibleLinks ?? input.template.possibleLinks,
      possibleActions: input.possibleActions ?? input.template.possibleActions,
      possibleFunctions: input.possibleFunctions ?? input.template.possibleFunctions,
    },
    evidenceNeeded: input.evidenceNeeded ?? input.template.evidenceNeeded,
    sourceRefs: input.sourceRefs ?? [],
  };
}
