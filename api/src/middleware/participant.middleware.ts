import { Request } from 'express';

export function resolveParticipantId(req: Request): string | undefined {
  const headerValue =
    req.headers['x-participant-id'] ?? req.headers['x-user-id'];
  return typeof headerValue === 'string' ? headerValue : undefined;
}

export function resolveParticipantIdFromBody(req: Request): string | undefined {
  const bodyValue = req.body?.participantId ?? req.body?.userId;
  return typeof bodyValue === 'string' ? bodyValue : undefined;
}

export function resolveParticipantIdFromParams(req: Request): string | undefined {
  const paramValue = req.params?.participantId ?? req.params?.userId;
  return typeof paramValue === 'string' ? paramValue : undefined;
}
