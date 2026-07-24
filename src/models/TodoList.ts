// 前端共享的待办数据类型定义（不再依赖 Mongoose）
// 数据实际存储在 SQLite 中，通过 Prisma 访问；API 层会把数据库记录序列化为下述结构。

// 待办事项
export interface ITodo {
  _id?: string;
  content: string;
  comment?: string;
  status: 'important' | 'normal' | 'inProgress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

// 待办事项列
export interface ITodoColumn {
  _id?: string;
  title: string;
  todos: ITodo[];
  order: number;
}

// 待办事项面板
export interface ITodoBoard {
  _id?: string;
  userId: string;
  columns: ITodoColumn[];
}
