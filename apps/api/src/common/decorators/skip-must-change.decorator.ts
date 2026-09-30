import { SetMetadata } from '@nestjs/common';

export const SKIP_MUST_CHANGE_KEY = 'skipMustChange';

/**
 * Marks a route as reachable even while the caller's mustChangePassword /
 * mustChangePin flag is set — otherwise MustChangeCredentialGuard blocks
 * everything except @Public() routes until the credential is changed.
 */
export const SkipMustChange = () => SetMetadata(SKIP_MUST_CHANGE_KEY, true);
