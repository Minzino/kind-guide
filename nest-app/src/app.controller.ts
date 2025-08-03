import { Controller, Get, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = '/data';
const DATA_FILE = path.join(DATA_DIR, 'message.txt');

@Controller()
export class AppController {

  constructor() {
    // 앱 시작 시 데이터 디렉토리 생성
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  @Get()
  getHello(): string {
    return 'Hello World! Welcome to the persistence test.';
  }

  @Post('/message')
  async postMessage(@Body('message') message: string, @Res() res: Response) {
    if (!message) {
      return res.status(HttpStatus.BAD_REQUEST).send('Message cannot be empty');
    }
    try {
      await fs.promises.writeFile(DATA_FILE, message);
      return res.status(HttpStatus.CREATED).send(`Message saved: ${message}`);
    } catch (error) {
      console.error('Failed to write file:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Failed to save message');
    }
  }

  @Get('/message')
  async getMessage(@Res() res: Response) {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const message = await fs.promises.readFile(DATA_FILE, 'utf-8');
        return res.status(HttpStatus.OK).send(message);
      } else {
        return res.status(HttpStatus.NOT_FOUND).send('No message found');
      }
    } catch (error) {
      console.error('Failed to read file:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Failed to read message');
    }
  }

  @Get('/config/env')
  getEnvConfig(): string {
    return `My environment variable value: ${process.env.MY_ENV_VAR || 'Not set'}`;
  }

  @Get('/config/configmap')
  async getConfigMap(): Promise<string> {
    const configPath = '/etc/config/app_config.txt';
    try {
      if (fs.existsSync(configPath)) {
        const config = await fs.promises.readFile(configPath, 'utf-8');
        return `ConfigMap value: ${config}`;
      } else {
        return `ConfigMap file not found at ${configPath}`;
      }
    } catch (error) {
      console.error('Failed to read ConfigMap file:', error);
      return `Failed to read ConfigMap: ${error.message}`;
    }
  }

  @Get('/config/secret')
  async getSecret(): Promise<string> {
    const secretPath = '/etc/secrets/api_key.txt';
    try {
      if (fs.existsSync(secretPath)) {
        const secret = await fs.promises.readFile(secretPath, 'utf-8');
        return `Secret value: ${secret}`;
      } else {
        return `Secret file not found at ${secretPath}`;
      }
    } catch (error) {
      console.error('Failed to read Secret file:', error);
      return `Failed to read Secret: ${error.message}`;
    }
  }
}