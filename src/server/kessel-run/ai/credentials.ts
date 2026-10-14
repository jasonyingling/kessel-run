import { readFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ownerWrite, privateRoot, privateFile } from '../local-session';

export const credentialSelection = z.enum(['environment', 'saved']);
export type CredentialSource = z.infer<typeof credentialSelection>;
const savedSchema = z.object({
  reference: z.string().uuid(),
  key: z.string().min(20).max(512),
}).strict();

export class CredentialError extends Error {
  constructor() {
    super('The selected credential is unavailable. Configure or replace it in Settings.');
  }
}

export class Credentials {
  constructor(
    private readonly root = privateRoot(),
    private readonly environment: () => string | undefined = () => process.env.OPENAI_API_KEY,
  ) {}

  private async saved() {
    try {
      const content = await readFile(privateFile('credential.json', this.root), 'utf8');
      return savedSchema.parse(JSON.parse(content));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw new CredentialError();
    }
  }

  async status() {
    const saved = await this.saved();
    return {
      environment: Boolean(this.environment()),
      saved: saved ? {
        reference: saved.reference,
        masked: `••••${saved.key.slice(-4)}`,
      } : null,
      storage: 'owner-only-local-file' as const,
    };
  }

  async replace(key: string) {
    const record = savedSchema.parse({ reference: randomUUID(), key });
    await ownerWrite('credential.json', record, this.root);
    return {
      reference: record.reference,
      masked: `••••${record.key.slice(-4)}`,
    };
  }

  async remove() {
    await unlink(privateFile('credential.json', this.root)).catch(error => {
      if (error.code !== 'ENOENT') throw error;
    });
  }

  async resolve(source: CredentialSource): Promise<string> {
    // An explicit source never falls back to another credential.
    const key = source === 'environment' ? this.environment() : (await this.saved())?.key;
    if (!key) throw new CredentialError();
    return key;
  }
}
