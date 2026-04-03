import { readFileSync } from 'fs';
import { join } from 'path';

describe('AppModule config loading', () => {
  it('registers blockchainConfig in ConfigModule.forRoot load list', () => {
    const appModuleSource = readFileSync(join(__dirname, 'app.module.ts'), 'utf8');

    expect(appModuleSource).toContain("import blockchainConfig from './config/blockchain.config';");
    expect(appModuleSource).toContain('load: [appConfig, databaseConfig, telegramConfig, jwtConfig, blockchainConfig]');
  });
});
