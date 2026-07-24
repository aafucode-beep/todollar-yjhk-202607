import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // 基本输入验证
    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // 验证邮箱格式
    const emailRegex = /.+@.+\..+/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: '无效的邮箱格式' }, { status: 400 });
    }

    // 验证密码长度
    if (String(password).length < 6) {
      return NextResponse.json({ error: '密码长度至少需要6位' }, { status: 400 });
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 409 });
    }

    // 哈希密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建新用户
    await prisma.user.create({
      data: { email: normalizedEmail, passwordHash },
    });

    return NextResponse.json({ message: '用户注册成功' }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ error: '服务器内部错误', details: errorMessage }, { status: 500 });
  }
}
