import type { ChallengeId, EventId, LessonId, ObjectId, PlayerId, RoomId, SharedTransform, SlotId } from './primitives';

export type AtomElement = 'H' | 'O' | 'C' | 'N';
export type RoomPhase = 'lobby' | 'alignment' | 'lessonIntro' | 'building' | 'roundComplete' | 'quiz' | 'completed';
export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
export type AlignmentStatus = 'not-started' | 'awaiting-origin' | 'pending' | 'aligned' | 'failed';
export type SpatialConfidence = 'low' | 'medium' | 'high';
export type AtomLifecycle = 'tray' | 'held' | 'slotted';
export type ChallengeStatus = 'not-started' | 'building' | 'assembled' | 'quiz' | 'completed';
export type QuizStatus = 'idle' | 'active' | 'complete';
export type ScoreReason = 'build-complete' | 'quiz-correct' | 'bonus' | 'manual';

export interface AtomDefinition {
  element: AtomElement;
  label: string;
  colorHex: string;
  radius: number;
  defaultValence: number;
}

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizQuestionDefinition {
  id: string;
  prompt: string;
  promptShort: string;
  answerOptionIds: string[];
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
  conceptTag: 'geometry' | 'bond-count' | 'usage';
}

export interface BondSlotDefinition {
  slotId: SlotId;
  label: string;
  expectedElement: AtomElement;
  accepts: AtomElement[];
  bondOrder: 1 | 2 | 4;
  transform: SharedTransform;
  isCentralAtom: boolean;
}

export interface MoleculeChallengeDefinition {
  id: ChallengeId;
  moleculeId: string;
  title: string;
  formula: string;
  quickFact: string;
  learningGoal: string;
  geometry: string;
  bondCount: number;
  realWorldUse: string;
  trayAtoms: AtomElement[];
  slots: BondSlotDefinition[];
  quizQuestions: QuizQuestionDefinition[];
}

export interface LessonDefinition {
  id: LessonId;
  title: string;
  summary: string;
  facilitatorPrompt: string;
  targetPlayers: {
    min: number;
    max: number;
  };
  challenges: MoleculeChallengeDefinition[];
}

export interface ParticipantAlignment {
  status: AlignmentStatus;
  confidence: SpatialConfidence;
  lastConfirmedAt: number | null;
  localCalibrationOffset: SharedTransform | null;
  instructions: string;
}

export interface PlayerPresence {
  connectionStatus: ConnectionStatus;
  heldObjectId: ObjectId | null;
  lastHeartbeatAt: number;
}

export interface PlayerState {
  id: PlayerId;
  displayName: string;
  isHost: boolean;
  ready: boolean;
  joinedAt: number;
  presence: PlayerPresence;
  alignment: ParticipantAlignment;
}

export interface SharedOriginAnchor {
  anchorId: string;
  establishedBy: PlayerId | null;
  establishedAt: number | null;
  transform: SharedTransform | null;
  nearbyUserAssumption: string;
}

export interface CoLocationState {
  mode: 'nearby-friend';
  sharedOrigin: SharedOriginAnchor;
  reAlignmentNeeded: boolean;
  lateJoinFallback: string;
  statusMessage: string;
}

export interface BondSlotState {
  slotId: SlotId;
  label: string;
  expectedElement: AtomElement;
  accepts: AtomElement[];
  bondOrder: 1 | 2 | 4;
  transform: SharedTransform;
  occupiedObjectId: ObjectId | null;
  isCentralAtom: boolean;
}

export interface SyncedAtomState {
  objectId: ObjectId;
  kind: 'atom';
  element: AtomElement;
  label: string;
  colorHex: string;
  transform: SharedTransform;
  trayTransform: SharedTransform;
  ownerId: PlayerId | null;
  lifecycle: AtomLifecycle;
  slotId: SlotId | null;
  revision: number;
  updatedAt: number;
  lastUpdatedBy: PlayerId | null;
}

export interface CelebrationState {
  moleculeName: string;
  formula: string;
  quickFact: string;
  callToAction: string;
  completedAt: number;
}

export interface ActiveChallengeState {
  challengeId: ChallengeId;
  status: ChallengeStatus;
  atomOrder: ObjectId[];
  slotOrder: SlotId[];
  slots: Record<SlotId, BondSlotState>;
  assembledAt: number | null;
  completedAt: number | null;
}

export interface LessonProgressState {
  lessonId: LessonId;
  currentRound: number;
  currentChallengeIndex: number;
  currentChallengeId: ChallengeId | null;
  activeChallenge: ActiveChallengeState | null;
  completedChallengeIds: ChallengeId[];
  celebration: CelebrationState | null;
}

export interface ScoreEvent {
  eventId: EventId;
  reason: ScoreReason;
  amount: number;
  awardedBy: PlayerId | 'system';
  challengeId: ChallengeId | null;
  timestamp: number;
  note: string;
}

export interface ScoreState {
  teamScore: number;
  perPlayer: Record<PlayerId, number>;
  history: ScoreEvent[];
}

export interface QuizSubmission {
  playerId: PlayerId;
  questionId: string;
  optionId: string;
  correct: boolean;
  submittedAt: number;
}

export interface QuizState {
  challengeId: ChallengeId;
  status: QuizStatus;
  currentQuestionIndex: number;
  questions: QuizQuestionDefinition[];
  submissionsByQuestion: Record<string, Record<PlayerId, QuizSubmission>>;
  revealedQuestionIds: string[];
  completedAt: number | null;
}

export type DiagnosticLevel = 'debug' | 'info' | 'warn' | 'error';
export type DiagnosticScope = 'session' | 'alignment' | 'interaction' | 'score' | 'network';

export interface DiagnosticEvent {
  id: string;
  level: DiagnosticLevel;
  scope: DiagnosticScope;
  message: string;
  timestamp: number;
  context?: Record<string, string | number | boolean | null>;
}

export type RoomErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'DUPLICATE_ROOM'
  | 'INVALID_STATE_TRANSITION'
  | 'INVALID_PLACEMENT'
  | 'OWNERSHIP_CONFLICT'
  | 'PLAYER_NOT_FOUND'
  | 'DESYNC_DETECTED'
  | 'ALIGNMENT_REQUIRED'
  | 'QUIZ_NOT_ACTIVE'
  | 'CHALLENGE_NOT_ACTIVE'
  | 'HOST_ONLY_ACTION'
  | 'INVALID_ROOM_ID';

export interface RoomLabError {
  code: RoomErrorCode;
  message: string;
  recoverable: boolean;
  details?: Record<string, string | number | boolean | null>;
}

export interface RoomState {
  roomId: RoomId;
  lessonId: LessonId;
  hostId: PlayerId;
  phase: RoomPhase;
  participants: Record<PlayerId, PlayerState>;
  participantOrder: PlayerId[];
  coLocation: CoLocationState;
  lesson: LessonProgressState;
  objects: Record<ObjectId, SyncedAtomState>;
  score: ScoreState;
  quiz: QuizState | null;
  diagnostics: DiagnosticEvent[];
  lastError: RoomLabError | null;
  version: number;
  updatedAt: number;
}

export interface CreateRoomOptions {
  roomId: RoomId;
  lesson: LessonDefinition;
  hostId: PlayerId;
  displayName: string;
  now: number;
}

export interface TransitionResult {
  accepted: boolean;
  state: RoomState;
  error?: RoomLabError;
  scoreChanged: boolean;
  scoreReason?: string;
}

export interface RoomHydrationPayload {
  roomId: RoomId;
  version: number;
  reason: 'create' | 'hydrate' | 'event' | 'desync';
  state: RoomState;
  serverTime: number;
}
