/**
 * Имена cookie, в которых хранится участие гостя в командном конкурсе.
 * Вынесены отдельно, потому что их читают и квиз, и мини-игры: если бы каждый
 * модуль объявлял их у себя, они бы со временем разъехались.
 */
export const teamCookieName = (eventId: string) => `ailshan_quiz_team_${eventId}`;
export const memberCookieName = (eventId: string) => `ailshan_quiz_member_${eventId}`;
