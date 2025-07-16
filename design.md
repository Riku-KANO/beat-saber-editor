# Beat Saber Editor 設計ドキュメント

## 1. システム設計概要

### 1.1 アーキテクチャ概要
Beat Saber Editorは、モジュラー設計によるWebベースの3D譜面エディターです。React Three Fiberを核とした3D描画システムと、PixiJSによる高性能タイムライン、Zustandによる状態管理を組み合わせています。

### 1.2 設計原則
- **モジュラー設計**: 各機能を独立したモジュールとして実装
- **関心の分離**: UI、状態管理、3D描画、音声処理を分離
- **パフォーマンス重視**: WebGL最適化とメモリ効率化
- **拡張性**: 新機能追加が容易な設計
- **型安全性**: TypeScriptによる厳密な型チェック

## 2. システムアーキテクチャ

### 2.1 全体アーキテクチャ図
```
┌─────────────────────────────────────────────────┐
│                 Frontend Layer                   │
├─────────────────────────────────────────────────┤
│  React Components                                │
│  ├─ App.tsx (Root)                              │
│  ├─ Editor Tab                                  │
│  │  ├─ Scene.tsx (3D View)                     │
│  │  ├─ View2D.tsx (2D View)                    │
│  │  └─ Timeline.tsx (Timeline)                 │
│  ├─ Preview Tab                                 │
│  │  └─ PreviewControls.tsx                     │
│  └─ XR Components                               │
│     ├─ XRButton.tsx                            │
│     ├─ XRHands.tsx                             │
│     └─ XRAudioControls.tsx                     │
├─────────────────────────────────────────────────┤
│  State Management Layer (Zustand)               │
│  ├─ editorStore.ts                             │
│  └─ projectStore.ts                            │
├─────────────────────────────────────────────────┤
│  Service Layer                                  │
│  ├─ audioManager.ts                            │
│  ├─ audioService.ts                            │
│  └─ timelineUtils.ts                           │
├─────────────────────────────────────────────────┤
│  Rendering Layer                                │
│  ├─ React Three Fiber (3D)                     │
│  ├─ PixiJS (2D Timeline)                       │
│  └─ WebXR (VR/AR)                              │
├─────────────────────────────────────────────────┤
│  Browser APIs                                   │
│  ├─ Web Audio API                              │
│  ├─ WebGL                                      │
│  ├─ WebXR Device API                           │
│  └─ Local Storage                              │
└─────────────────────────────────────────────────┘
```

### 2.2 データフロー
```
Audio File → audioService → audioManager → editorStore
                                              ↓
UI Components ← editorStore → 3D Scene → React Three Fiber
                    ↓              ↓
              Timeline ← timelineUtils → PixiJS Timeline
                    ↓
              projectStore → Local Storage
```

## 3. 状態管理設計

### 3.1 Zustandストア構造

#### 3.1.1 editorStore.ts
```typescript
interface EditorState {
  // オブジェクト管理
  objects: EditorObject[];
  selectedObjectId: string | null;
  
  // タイムライン状態
  currentTime: number;
  duration: number;
  bpm: number;
  beatsPerMeasure: number;
  
  // 音声管理
  audioFile: File | null;
  audioBuffer: AudioBuffer | null;
  audioManager: AudioManager | null;
  
  // 再生状態
  isPlaying: boolean;
  isEditorPlaying: boolean;
  isPreviewMode: boolean;
  
  // UI状態
  viewMode: '3d' | '2d' | 'dual';
  sidebarOpen: boolean;
  
  // XR状態
  xrMode: 'none' | 'vr' | 'ar';
  xrSupported: boolean;
  
  // 難易度管理
  currentDifficulty: DifficultyLevel;
  difficulties: Map<DifficultyLevel, EditorObject[]>;
  
  // アクション
  addObject: (object: EditorObject) => void;
  updateObject: (id: string, updates: Partial<EditorObject>) => void;
  deleteObject: (id: string) => void;
  setSelectedObject: (id: string | null) => void;
  
  setCurrentTime: (time: number) => void;
  setAudioFile: (file: File) => void;
  setPlayback: (playing: boolean) => void;
  
  addKeyframe: (objectId: string, keyframe: Keyframe) => void;
  updateKeyframe: (objectId: string, keyframeIndex: number, updates: Partial<Keyframe>) => void;
  deleteKeyframe: (objectId: string, keyframeIndex: number) => void;
  
  setDifficulty: (level: DifficultyLevel) => void;
  switchViewMode: (mode: '3d' | '2d' | 'dual') => void;
  toggleSidebar: () => void;
  
  enterXR: (mode: 'vr' | 'ar') => void;
  exitXR: () => void;
}
```

#### 3.1.2 projectStore.ts
```typescript
interface ProjectState {
  // プロジェクト情報
  currentProject: EditorProject | null;
  projects: EditorProject[];
  
  // 設定
  settings: {
    theme: 'light' | 'dark';
    language: 'ja' | 'en';
    autoSave: boolean;
    performanceMode: boolean;
  };
  
  // アクション
  createProject: (name: string, audioFile: File) => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  
  exportProject: (format: 'json' | 'dat') => Promise<Blob>;
  importProject: (file: File) => Promise<void>;
  
  updateSettings: (updates: Partial<typeof settings>) => void;
}
```

### 3.2 データ型定義

#### 3.2.1 コアデータ型
```typescript
// オブジェクト型
type ObjectType = 'block' | 'bomb' | 'obstacle' | 'saber' | 'effect';
type ObjectColor = 'red' | 'blue' | 'gray';
type CutDirection = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; // 8方向+ドット
type DifficultyLevel = 'Easy' | 'Normal' | 'Hard' | 'Expert' | 'Expert+';

// エディターオブジェクト
interface EditorObject {
  id: string;
  type: ObjectType;
  color: ObjectColor;
  cutDirection: CutDirection;
  keyframes: Keyframe[];
  
  // タイプ別プロパティ
  blockProperties?: {
    width: number;
    height: number;
  };
  obstacleProperties?: {
    duration: number;
    width: number;
    height: number;
  };
  effectProperties?: {
    effectType: string;
    intensity: number;
  };
}

// キーフレーム
interface Keyframe {
  time: number; // 秒単位
  position: [number, number, number]; // [x, y, z]
  rotation: [number, number, number]; // [x, y, z] ラジアン
  scale?: [number, number, number]; // オプション
}

// プロジェクト
interface EditorProject {
  id: string;
  name: string;
  audioFile: File;
  audioBuffer: AudioBuffer;
  
  // 楽曲情報
  bpm: number;
  beatsPerMeasure: number;
  duration: number;
  
  // 難易度別データ
  difficulties: Map<DifficultyLevel, {
    objects: EditorObject[];
    njs: number; // Note Jump Speed
    spawnDistance: number;
  }>;
  
  // メタデータ
  createdAt: Date;
  updatedAt: Date;
  version: string;
}
```

## 4. コンポーネント設計

### 4.1 コンポーネント階層
```
App.tsx
├─ ThemeProvider
├─ Sidebar.tsx
│  ├─ ProjectControls
│  ├─ ObjectList
│  ├─ AudioImport
│  └─ DifficultySelector
├─ TabContainer
│  ├─ EditorTab
│  │  ├─ ViewportContainer
│  │  │  ├─ Scene.tsx (3D View)
│  │  │  └─ View2D.tsx (2D View)
│  │  └─ Timeline.tsx
│  │     ├─ ReactPixiTimeline.tsx
│  │     ├─ TimelineControls
│  │     └─ KeyframeEditor
│  └─ PreviewTab
│     ├─ PreviewScene
│     └─ PreviewControls.tsx
└─ XRInterface
   ├─ XRButton.tsx
   ├─ XRHands.tsx
   └─ XRAudioControls.tsx
```

### 4.2 主要コンポーネント詳細

#### 4.2.1 Scene.tsx (3D View)
```typescript
interface SceneProps {
  viewMode: '3d' | '2d' | 'dual';
  xrMode: 'none' | 'vr' | 'ar';
}

const Scene: React.FC<SceneProps> = ({ viewMode, xrMode }) => {
  const { objects, currentTime, selectedObjectId } = useEditorStore();
  
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 50 }}
      gl={{ 
        antialias: false, 
        alpha: false,
        powerPreference: 'high-performance'
      }}
      performance={{ min: 0.5 }}
    >
      <XR referenceSpace="local">
        {/* 環境設定 */}
        <Environment preset="warehouse" />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />
        
        {/* Beat Saberオブジェクト */}
        {objects.map(obj => (
          <BeatSaberObject
            key={obj.id}
            object={obj}
            currentTime={currentTime}
            selected={obj.id === selectedObjectId}
          />
        ))}
        
        {/* 変形ギズモ */}
        {selectedObjectId && (
          <TransformGizmo
            objectId={selectedObjectId}
            currentTime={currentTime}
          />
        )}
        
        {/* 3Dタイムライン */}
        <Timeline3D />
        
        {/* XRコントロール */}
        {xrMode !== 'none' && (
          <>
            <XRHands />
            <XRAudioControls />
          </>
        )}
      </XR>
    </Canvas>
  );
};
```

#### 4.2.2 ReactPixiTimeline.tsx
```typescript
interface TimelineProps {
  width: number;
  height: number;
  duration: number;
  currentTime: number;
  bpm: number;
  beatsPerMeasure: number;
  waveformData: Float32Array;
  objects: EditorObject[];
  onTimeChange: (time: number) => void;
  onKeyframeUpdate: (objectId: string, keyframeIndex: number, updates: Partial<Keyframe>) => void;
}

const ReactPixiTimeline: React.FC<TimelineProps> = ({
  width,
  height,
  duration,
  currentTime,
  bpm,
  beatsPerMeasure,
  waveformData,
  objects,
  onTimeChange,
  onKeyframeUpdate
}) => {
  const app = useApp();
  const [timelineContainer, setTimelineContainer] = useState<Container | null>(null);
  
  // タイムライン描画ロジック
  useEffect(() => {
    if (!timelineContainer) return;
    
    // 波形描画
    const waveform = new Graphics();
    drawWaveform(waveform, waveformData, width, height);
    
    // グリッド描画
    const grid = new Graphics();
    drawGrid(grid, width, height, duration, bpm, beatsPerMeasure);
    
    // キーフレーム描画
    const keyframes = new Container();
    objects.forEach(obj => {
      obj.keyframes.forEach((keyframe, index) => {
        const keyframeSprite = createKeyframeSprite(
          obj.id,
          index,
          keyframe,
          duration,
          width,
          height
        );
        keyframes.addChild(keyframeSprite);
      });
    });
    
    // 現在時刻マーカー
    const playhead = new Graphics();
    drawPlayhead(playhead, currentTime, duration, width, height);
    
    timelineContainer.addChild(waveform, grid, keyframes, playhead);
    
    return () => {
      timelineContainer.removeChildren();
    };
  }, [timelineContainer, duration, currentTime, bpm, beatsPerMeasure, waveformData, objects]);
  
  return (
    <Stage width={width} height={height} options={{ antialias: false }}>
      <Container ref={setTimelineContainer} />
    </Stage>
  );
};
```

### 4.3 XRコンポーネント設計

#### 4.3.1 XRHands.tsx
```typescript
const XRHands: React.FC = () => {
  const { objects, addObject, updateObject, selectedObjectId } = useEditorStore();
  const [handPoses, setHandPoses] = useState<{
    left: XRHandPose | null;
    right: XRHandPose | null;
  }>({ left: null, right: null });
  
  useXRHandTracking((poses) => {
    setHandPoses(poses);
  });
  
  // 手の位置でオブジェクト操作
  useXRGesture('pinch', (hand, position) => {
    if (selectedObjectId) {
      // 選択されたオブジェクトを移動
      const obj = objects.find(o => o.id === selectedObjectId);
      if (obj) {
        updateObject(selectedObjectId, {
          keyframes: obj.keyframes.map(kf => ({
            ...kf,
            position: position
          }))
        });
      }
    }
  });
  
  useXRGesture('tap', (hand, position) => {
    // 新しいブロックを追加
    const newBlock: EditorObject = {
      id: generateId(),
      type: 'block',
      color: hand === 'left' ? 'red' : 'blue',
      cutDirection: 1,
      keyframes: [{
        time: currentTime,
        position: position,
        rotation: [0, 0, 0]
      }]
    };
    addObject(newBlock);
  });
  
  return (
    <>
      {handPoses.left && (
        <HandModel
          pose={handPoses.left}
          hand="left"
          saberColor="red"
        />
      )}
      {handPoses.right && (
        <HandModel
          pose={handPoses.right}
          hand="right"
          saberColor="blue"
        />
      )}
    </>
  );
};
```

## 5. サービス層設計

### 5.1 AudioManager
```typescript
class AudioManager {
  private audioContext: AudioContext;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode;
  private analyserNode: AnalyserNode;
  private startTime: number = 0;
  private pausedAt: number = 0;
  private isPlaying: boolean = false;
  
  constructor() {
    this.audioContext = new AudioContext();
    this.gainNode = this.audioContext.createGain();
    this.analyserNode = this.audioContext.createAnalyser();
    
    this.gainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.audioContext.destination);
  }
  
  async loadAudio(file: File): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
  }
  
  play(startTime: number = 0): void {
    if (!this.audioBuffer) return;
    
    this.stop();
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(this.gainNode);
    
    this.startTime = this.audioContext.currentTime - startTime;
    this.sourceNode.start(0, startTime);
    this.isPlaying = true;
  }
  
  pause(): void {
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.pausedAt = this.audioContext.currentTime - this.startTime;
      this.isPlaying = false;
    }
  }
  
  stop(): void {
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
      this.isPlaying = false;
      this.pausedAt = 0;
    }
  }
  
  getCurrentTime(): number {
    if (this.isPlaying && this.sourceNode) {
      return this.audioContext.currentTime - this.startTime;
    }
    return this.pausedAt;
  }
  
  getWaveformData(): Float32Array {
    if (!this.audioBuffer) return new Float32Array(0);
    
    const data = this.audioBuffer.getChannelData(0);
    const samples = 1000; // 1000点でサンプリング
    const blockSize = Math.floor(data.length / samples);
    const waveform = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(data[i * blockSize + j]);
      }
      waveform[i] = sum / blockSize;
    }
    
    return waveform;
  }
}
```

### 5.2 TimelineUtils
```typescript
export class TimelineUtils {
  static timeToPixels(time: number, duration: number, width: number): number {
    return (time / duration) * width;
  }
  
  static pixelsToTime(pixels: number, duration: number, width: number): number {
    return (pixels / width) * duration;
  }
  
  static snapToGrid(time: number, bpm: number, subdivision: number = 16): number {
    const beatDuration = 60 / bpm;
    const snapDuration = beatDuration / subdivision;
    return Math.round(time / snapDuration) * snapDuration;
  }
  
  static interpolateKeyframes(
    keyframes: Keyframe[],
    time: number
  ): { position: [number, number, number]; rotation: [number, number, number] } {
    if (keyframes.length === 0) {
      return { position: [0, 0, 0], rotation: [0, 0, 0] };
    }
    
    if (keyframes.length === 1) {
      return {
        position: keyframes[0].position,
        rotation: keyframes[0].rotation
      };
    }
    
    // 前後のキーフレームを見つける
    let prevKeyframe = keyframes[0];
    let nextKeyframe = keyframes[keyframes.length - 1];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (keyframes[i].time <= time && keyframes[i + 1].time > time) {
        prevKeyframe = keyframes[i];
        nextKeyframe = keyframes[i + 1];
        break;
      }
    }
    
    // 線形補間
    const t = (time - prevKeyframe.time) / (nextKeyframe.time - prevKeyframe.time);
    const clampedT = Math.max(0, Math.min(1, t));
    
    return {
      position: [
        prevKeyframe.position[0] + (nextKeyframe.position[0] - prevKeyframe.position[0]) * clampedT,
        prevKeyframe.position[1] + (nextKeyframe.position[1] - prevKeyframe.position[1]) * clampedT,
        prevKeyframe.position[2] + (nextKeyframe.position[2] - prevKeyframe.position[2]) * clampedT
      ],
      rotation: [
        prevKeyframe.rotation[0] + (nextKeyframe.rotation[0] - prevKeyframe.rotation[0]) * clampedT,
        prevKeyframe.rotation[1] + (nextKeyframe.rotation[1] - prevKeyframe.rotation[1]) * clampedT,
        prevKeyframe.rotation[2] + (nextKeyframe.rotation[2] - prevKeyframe.rotation[2]) * clampedT
      ]
    };
  }
  
  static getBeatPositions(duration: number, bpm: number, beatsPerMeasure: number): number[] {
    const beatDuration = 60 / bpm;
    const positions: number[] = [];
    
    for (let time = 0; time < duration; time += beatDuration) {
      positions.push(time);
    }
    
    return positions;
  }
  
  static validateBPM(bpm: number): boolean {
    return bpm > 0 && bpm <= 300;
  }
}
```

## 6. パフォーマンス最適化

### 6.1 WebGL最適化
```typescript
// Three.jsレンダラー設定
const renderer = new WebGLRenderer({
  canvas: canvas,
  antialias: false,
  alpha: false,
  powerPreference: 'high-performance'
});

// メモリ使用量削減
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = false;
renderer.sortObjects = false;

// オブジェクトプーリング
class ObjectPool<T> {
  private objects: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  
  constructor(createFn: () => T, resetFn: (obj: T) => void) {
    this.createFn = createFn;
    this.resetFn = resetFn;
  }
  
  get(): T {
    if (this.objects.length > 0) {
      return this.objects.pop()!;
    }
    return this.createFn();
  }
  
  release(obj: T): void {
    this.resetFn(obj);
    this.objects.push(obj);
  }
}
```

### 6.2 カリング最適化
```typescript
export class CullingUtils {
  static frustumCull(
    objects: EditorObject[],
    camera: PerspectiveCamera,
    frustum: Frustum
  ): EditorObject[] {
    return objects.filter(obj => {
      const sphere = new Sphere(
        new Vector3(...obj.keyframes[0]?.position || [0, 0, 0]),
        1.0 // オブジェクトの境界半径
      );
      return frustum.intersectsSphere(sphere);
    });
  }
  
  static distanceCull(
    objects: EditorObject[],
    camera: PerspectiveCamera,
    maxDistance: number
  ): EditorObject[] {
    const cameraPos = camera.position;
    
    return objects.filter(obj => {
      const objPos = new Vector3(...obj.keyframes[0]?.position || [0, 0, 0]);
      return cameraPos.distanceTo(objPos) <= maxDistance;
    });
  }
  
  static timeCull(
    objects: EditorObject[],
    currentTime: number,
    timeWindow: number
  ): EditorObject[] {
    return objects.filter(obj => {
      return obj.keyframes.some(kf => 
        Math.abs(kf.time - currentTime) <= timeWindow
      );
    });
  }
}
```

## 7. エラーハンドリング

### 7.1 AudioService Error Handling
```typescript
export class AudioService {
  static async validateAudioFile(file: File): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: []
    };
    
    // ファイルサイズチェック
    if (file.size > 30 * 1024 * 1024) { // 30MB
      result.isValid = false;
      result.errors.push('ファイルサイズは30MB以下である必要があります');
    }
    
    // MIMEタイプチェック
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac'];
    if (!allowedTypes.includes(file.type)) {
      result.isValid = false;
      result.errors.push('サポートされていないファイル形式です');
    }
    
    // 音声データの検証
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new AudioContext();
      await audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      result.isValid = false;
      result.errors.push('音声ファイルの読み込みに失敗しました');
    }
    
    return result;
  }
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

### 7.2 エラーバウンダリー
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class EditorErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Editor Error:', error, errorInfo);
    
    // エラーログの送信（将来的な実装）
    // this.sendErrorReport(error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>エラーが発生しました</h2>
          <details>
            <summary>エラー詳細</summary>
            <pre>{this.state.error?.stack}</pre>
          </details>
          <button onClick={() => window.location.reload()}>
            リロード
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

## 8. テスト戦略

### 8.1 単体テスト
```typescript
// TimelineUtils.test.ts
import { TimelineUtils } from '../utils/timelineUtils';

describe('TimelineUtils', () => {
  describe('timeToPixels', () => {
    it('should convert time to pixels correctly', () => {
      expect(TimelineUtils.timeToPixels(1, 4, 400)).toBe(100);
      expect(TimelineUtils.timeToPixels(2, 4, 400)).toBe(200);
    });
  });
  
  describe('snapToGrid', () => {
    it('should snap to 16th note grid', () => {
      expect(TimelineUtils.snapToGrid(1.1, 120, 16)).toBeCloseTo(1.125);
      expect(TimelineUtils.snapToGrid(1.0, 120, 16)).toBeCloseTo(1.0);
    });
  });
  
  describe('interpolateKeyframes', () => {
    it('should interpolate between keyframes', () => {
      const keyframes = [
        { time: 0, position: [0, 0, 0], rotation: [0, 0, 0] },
        { time: 2, position: [2, 0, 0], rotation: [0, 0, 0] }
      ];
      
      const result = TimelineUtils.interpolateKeyframes(keyframes, 1);
      expect(result.position).toEqual([1, 0, 0]);
    });
  });
});
```

### 8.2 統合テスト
```typescript
// EditorStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';

describe('EditorStore', () => {
  it('should add and update objects', () => {
    const { result } = renderHook(() => useEditorStore());
    
    act(() => {
      result.current.addObject({
        id: 'test-1',
        type: 'block',
        color: 'red',
        cutDirection: 1,
        keyframes: []
      });
    });
    
    expect(result.current.objects).toHaveLength(1);
    expect(result.current.objects[0].id).toBe('test-1');
    
    act(() => {
      result.current.updateObject('test-1', { color: 'blue' });
    });
    
    expect(result.current.objects[0].color).toBe('blue');
  });
});
```

### 8.3 E2Eテスト
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run dev',
    port: 3000
  }
});

// editor.e2e.ts
import { test, expect } from '@playwright/test';

test('should create new project and add objects', async ({ page }) => {
  await page.goto('/');
  
  // プロジェクト作成
  await page.click('[data-testid="new-project-button"]');
  await page.fill('[data-testid="project-name"]', 'Test Project');
  
  // 音声ファイルアップロード
  await page.setInputFiles('[data-testid="audio-input"]', 'test-audio.mp3');
  
  // オブジェクト追加
  await page.click('[data-testid="add-block-button"]');
  
  // 3Dシーンでオブジェクト確認
  await expect(page.locator('[data-testid="3d-scene"]')).toBeVisible();
  
  // タイムラインでキーフレーム確認
  await expect(page.locator('[data-testid="timeline-keyframe"]')).toBeVisible();
});
```

## 9. デプロイメント

### 9.1 ビルド設定
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'pixi-vendor': ['pixi.js', '@pixi/react'],
          'audio-vendor': ['tone', 'wavesurfer.js']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 3000,
    host: true
  },
  preview: {
    port: 4173,
    host: true
  }
});
```

### 9.2 PWA対応
```typescript
// vite.config.ts (PWA追加)
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Beat Saber Editor',
        short_name: 'BSEditor',
        description: 'Create Beat Saber maps with intuitive 3D editing',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'landscape',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
```

## 10. 今後の拡張計画

### 10.1 AIアシスト機能
```typescript
interface AIAssistService {
  analyzeAudio(audioBuffer: AudioBuffer): Promise<{
    bpm: number;
    beats: number[];
    energy: number[];
    segments: AudioSegment[];
  }>;
  
  generateBeatmap(
    audioAnalysis: AudioAnalysis,
    difficulty: DifficultyLevel
  ): Promise<EditorObject[]>;
  
  optimizeBeatmap(
    objects: EditorObject[],
    constraints: BeatmapConstraints
  ): Promise<EditorObject[]>;
}
```

### 10.2 協調編集機能
```typescript
interface CollaborationService {
  createSession(projectId: string): Promise<SessionId>;
  joinSession(sessionId: SessionId): Promise<void>;
  
  broadcastChange(change: EditorChange): void;
  onRemoteChange(callback: (change: EditorChange) => void): void;
  
  getLiveUsers(): Promise<User[]>;
  getUserCursor(userId: string): Promise<CursorPosition>;
}
```

---

**文書作成日**: 2025年7月16日  
**バージョン**: 1.0  
**作成者**: Claude Code