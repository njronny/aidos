/**
 * 文件上传处理
 */

import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function uploadRoutes(fastify: FastifyInstance) {
  
  // 上传文件
  fastify.post('/upload', async (request, reply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.status(400).send({ success: false, error: 'No file uploaded' });
      }
      
      const filename = `${Date.now()}-${data.filename}`;
      const filepath = path.join(UPLOAD_DIR, filename);
      
      await fs.promises.writeFile(filepath, await data.toBuffer());
      
      return reply.send({
        success: true,
        data: {
          filename,
          path: `/uploads/${filename}`,
          size: (await fs.promises.stat(filepath)).size,
        }
      });
    } catch (error) {
      return reply.status(500).send({ success: false, error: 'Upload failed' });
    }
  });

  // 获取文件列表
  fastify.get('/uploads', async (request, reply) => {
    const adminUser = (request as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return reply.status(403).send({ success: false, error: '需要管理员权限' });
    }
    
    const files = await fs.promises.readdir(UPLOAD_DIR);
    const fileInfos = await Promise.all(
      files.map(async (file) => {
        const stat = await fs.promises.stat(path.join(UPLOAD_DIR, file));
        return {
          name: file,
          size: stat.size,
          created: stat.birthtime,
        };
      })
    );
    
    return reply.send({ success: true, data: fileInfos });
  });

  // 删除文件
  fastify.delete('/upload/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    const filepath = path.join(UPLOAD_DIR, filename);
    
    if (!fs.existsSync(filepath)) {
      return reply.status(404).send({ success: false, error: '文件不存在' });
    }
    
    await fs.promises.unlink(filepath);
    
    return reply.send({ success: true, message: '文件已删除' });
  });
}
