// 坐标点接口，表示网格中的一个位置
export interface Point {
  x: number;
  y: number;
}

// 提示点接口，表示关卡中带有数字提示的格子
export interface Hint {
  coord: Point;
  value: number;
}

// 关卡接口，包含关卡的完整信息
export interface Level {
  id: number;
  name: string;
  gridSize: number;
  hints: Hint[];
  hintCount?: number;
  completedCount: number;
  createdAt: string;
}

// 视图类型枚举，表示应用当前显示的页面
export type View = 'dashboard' | 'editor' | 'play';

// 游戏状态接口，用于追踪游戏进行过程中的状态
export interface GameState {
  currentLevel: Level | null;
  userPath: Point[];
  isCompleted: boolean;
}
