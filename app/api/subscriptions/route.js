import { handleSubscription } from '../../../newsletter.mjs';
import { runLegacyHandler } from '../bridge';

export const runtime = 'nodejs';
export const POST = (request) => runLegacyHandler(request, handleSubscription, 'SAPP_SUBSCRIPTIONS_FILE', '.data/subscriptions.json');
