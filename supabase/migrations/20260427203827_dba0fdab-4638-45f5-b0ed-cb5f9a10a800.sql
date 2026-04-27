REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_achievement(uuid, text) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_achievement(uuid, text) TO service_role;