import { handleApplication } from '../../../admission.mjs';
import { runLegacyHandler } from '../bridge';

export const runtime = 'nodejs';
export const POST = (request) => runLegacyHandler(request, handleApplication, 'SAPP_APPLICATIONS_FILE', '.data/applications.json');
