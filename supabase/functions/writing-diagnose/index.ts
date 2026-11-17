import { handleDiagnosis } from './handler.mjs';

Deno.serve((req: Request) => handleDiagnosis(req));
