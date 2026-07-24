import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import type { ITodo, ITodoColumn } from '@/models/TodoList';

// 允许的待办状态
const VALID_STATUS = new Set(['important', 'normal', 'inProgress', 'completed']);

// 将数据库中的列/待办序列化为前端期望的结构（id -> _id）
type ColumnWithTodos = {
  id: string;
  title: string;
  order: number;
  todos: {
    id: string;
    content: string;
    comment: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
};

function serializeBoard(userId: string, columns: ColumnWithTodos[]) {
  return {
    _id: userId,
    userId,
    columns: columns.map((col) => ({
      _id: col.id,
      title: col.title,
      order: col.order,
      todos: col.todos.map((todo) => ({
        _id: todo.id,
        content: todo.content,
        comment: todo.comment ?? '',
        status: todo.status,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
      })),
    })),
  };
}

async function loadColumns(userId: string): Promise<ColumnWithTodos[]> {
  return prisma.column.findMany({
    where: { userId },
    orderBy: { order: 'asc' },
    include: { todos: { orderBy: { order: 'asc' } } },
  });
}

// 获取用户的所有待办事项
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权访问' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    let columns = await loadColumns(userId);

    // 首次访问时创建一个默认列表
    if (columns.length === 0) {
      await prisma.column.create({
        data: { title: '待办事项', order: 0, userId },
      });
      columns = await loadColumns(userId);
    }

    return NextResponse.json(serializeBoard(userId, columns), { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: '获取待办事项失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 创建或更新待办事项面板（整体替换该用户的列与待办）
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权访问' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const data = await req.json();

    if (!data.columns || !Array.isArray(data.columns)) {
      return NextResponse.json({ error: '无效的数据格式' }, { status: 400 });
    }

    // 规范化输入，防止非法字段写入
    const columns = (data.columns as Partial<ITodoColumn>[]).map((column, colIndex) => ({
      title: String(column.title ?? '未命名列表').slice(0, 200),
      order: typeof column.order === 'number' ? column.order : colIndex,
      todos: (Array.isArray(column.todos) ? column.todos : []).map(
        (todo: Partial<ITodo>, todoIndex: number) => ({
          content: String(todo.content ?? '').slice(0, 5000),
          comment: todo.comment ? String(todo.comment).slice(0, 5000) : null,
          status: todo.status && VALID_STATUS.has(todo.status) ? todo.status : 'normal',
          order: todoIndex,
          createdAt: todo.createdAt ? new Date(todo.createdAt) : new Date(),
          updatedAt: todo.updatedAt ? new Date(todo.updatedAt) : new Date(),
        })
      ),
    }));

    // 在事务中整体替换：先删除该用户所有列（级联删除待办），再重新创建
    await prisma.$transaction(async (tx) => {
      await tx.column.deleteMany({ where: { userId } });
      for (const column of columns) {
        await tx.column.create({
          data: {
            title: column.title,
            order: column.order,
            userId,
            todos: { create: column.todos },
          },
        });
      }
    });

    const refreshed = await loadColumns(userId);
    return NextResponse.json(serializeBoard(userId, refreshed), { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: '更新待办事项失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
