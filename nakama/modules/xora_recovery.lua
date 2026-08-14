--[[
  XOrA Network password recovery RPCs.

  Registered names (do not rename):
    xora_user_by_email   — request a recovery token (stores only the hash)
    xora_set_password    — confirm the token and set the email password

  Authorization is XORA_RECOVERY_SECRET (HMAC), never the public SERVER_KEY.
  Put this in Nakama runtime.env and in the website environment:

    XORA_RECOVERY_SECRET=<secret that is not SERVER_KEY>

  Token records keep: Nakama user id, expiration, used=false.
  Only the SHA-256 hash of the token is stored. Lifetime is 15 minutes.
]]

local COLLECTION = "xora_recovery"
local TOKEN_TTL_MS = 15 * 60 * 1000
local MAX_TTL_SKEW_MS = 60 * 1000

local function env_value(ctx, name)
  local env = ctx.env
  if type(env) ~= "table" then
    return ""
  end

  local mapped = env[name]
  if type(mapped) == "string" and mapped ~= "" then
    return mapped
  end

  for _, entry in ipairs(env) do
    if type(entry) == "string" then
      local key, value = string.match(entry, "^([^=]+)=(.*)$")
      if key == name and value and value ~= "" then
        return value
      end
    end
  end

  return ""
end

local function recovery_secret(ctx, logger)
  local secret = env_value(ctx, "XORA_RECOVERY_SECRET")
  local server_key = env_value(ctx, "SERVER_KEY")
  if server_key == "" then
    server_key = env_value(ctx, "NAKAMA_SERVER_KEY")
  end

  if secret == "" then
    logger.error("XORA_RECOVERY_SECRET is missing; recovery RPCs fail closed")
    return ""
  end

  if server_key ~= "" and secret == server_key then
    logger.error("XORA_RECOVERY_SECRET must not equal SERVER_KEY")
    return ""
  end

  return secret
end

local function to_hex(raw)
  return (raw:gsub(".", function(char)
    return string.format("%02x", string.byte(char))
  end))
end

local function decode(nk, payload)
  if payload == nil or payload == "" then
    return {}
  end
  return nk.json_decode(payload)
end

local function hmac_hex(nk, key, message)
  return to_hex(nk.hmac_sha256_hash(message, key))
end

local function has_valid_signature(nk, key, message, signature)
  if key == "" or type(signature) ~= "string" or signature == "" then
    return false
  end
  return hmac_hex(nk, key, message) == signature
end

local function as_user_id(nk, id)
  if type(id) ~= "string" or id == "" then
    return ""
  end
  if #id == 16 then
    return nk.uuid_bytes_to_string(id)
  end
  return id
end

local function now_ms(nk)
  return nk.time() * 1000
end

local function user_id_for_email(nk, email)
  local rows = nk.sql_query("SELECT id FROM users WHERE email = $1 LIMIT 1", { email })
  if rows == nil or #rows == 0 then
    return ""
  end
  return as_user_id(nk, rows[1].id)
end

local function email_for_user(nk, user_id)
  local rows = nk.sql_query("SELECT email FROM users WHERE id = $1 LIMIT 1", { user_id })
  if rows == nil or #rows == 0 then
    return ""
  end
  local email = rows[1].email
  if type(email) ~= "string" then
    return ""
  end
  return string.lower(string.gsub(email, "^%s*(.-)%s*$", "%1"))
end

local function as_record(nk, value)
  if type(value) == "table" then
    return value
  end
  if type(value) == "string" and value ~= "" then
    local ok, decoded = pcall(nk.json_decode, value)
    if ok and type(decoded) == "table" then
      return decoded
    end
  end
  return nil
end

local function read_token_row(nk, token_hash)
  local rows = nk.sql_query(
    "SELECT user_id, value, version FROM storage WHERE collection = $1 AND key = $2 LIMIT 1",
    { COLLECTION, token_hash }
  )
  if rows == nil or #rows == 0 then
    return nil
  end
  return {
    user_id = as_user_id(nk, rows[1].user_id),
    value = as_record(nk, rows[1].value),
    version = rows[1].version,
  }
end

local function write_token(nk, user_id, token_hash, exp, used, version)
  local object = {
    collection = COLLECTION,
    key = token_hash,
    user_id = user_id,
    value = {
      userId = user_id,
      exp = exp,
      used = used,
    },
    permission_read = 0,
    permission_write = 0,
  }
  if type(version) == "string" and version ~= "" then
    object.version = version
  end
  nk.storage_write({ object })
end

local function rpc_user_by_email(ctx, logger, nk, payload)
  local key = recovery_secret(ctx, logger)
  local body = decode(nk, payload)
  local email = ""
  local token_hash = ""
  local exp = 0

  if type(body.email) == "string" then
    email = string.lower(string.gsub(body.email, "^%s*(.-)%s*$", "%1"))
  end
  if type(body.tokenHash) == "string" then
    token_hash = body.tokenHash
  end
  if type(body.exp) == "number" then
    exp = body.exp
  elseif type(body.exp) == "string" then
    exp = tonumber(body.exp) or 0
  end

  local exp_label = string.format("%.0f", exp)
  local message = "xora_user_by_email:" .. email .. ":" .. token_hash .. ":" .. exp_label
  if email == "" or #token_hash ~= 64 or exp <= 0 or not has_valid_signature(nk, key, message, body.signature) then
    logger.warn("xora_user_by_email rejected")
    return nk.json_encode({ created = false })
  end

  local now = now_ms(nk)
  if exp <= now or exp > now + TOKEN_TTL_MS + MAX_TTL_SKEW_MS then
    logger.warn("xora_user_by_email expired window")
    return nk.json_encode({ created = false })
  end

  local user_id = user_id_for_email(nk, email)
  if user_id == "" then
    logger.info("xora_user_by_email no account")
    return nk.json_encode({ created = false })
  end

  write_token(nk, user_id, token_hash, exp, false, nil)
  logger.info("xora_user_by_email stored")
  return nk.json_encode({ created = true })
end

local function rpc_set_password(ctx, logger, nk, payload)
  local key = recovery_secret(ctx, logger)
  local body = decode(nk, payload)
  local token_hash = ""
  local password = ""

  if type(body.tokenHash) == "string" then
    token_hash = body.tokenHash
  end
  if type(body.password) == "string" then
    password = body.password
  end

  local message = "xora_set_password:" .. token_hash
  if #token_hash ~= 64 or #password < 8 or not has_valid_signature(nk, key, message, body.signature) then
    logger.warn("xora_set_password rejected")
    return nk.json_encode({ ok = false })
  end

  local row = read_token_row(nk, token_hash)
  if row == nil or row.user_id == "" or type(row.value) ~= "table" then
    logger.warn("xora_set_password missing")
    return nk.json_encode({ ok = false })
  end

  local used = row.value.used == true
  local exp = tonumber(row.value.exp) or 0
  if used or exp <= now_ms(nk) then
    logger.warn("xora_set_password used_or_expired")
    return nk.json_encode({ ok = false })
  end

  local marked = pcall(function()
    write_token(nk, row.user_id, token_hash, exp, true, row.version)
  end)
  if not marked then
    logger.warn("xora_set_password mark_failed")
    return nk.json_encode({ ok = false })
  end

  local email = email_for_user(nk, row.user_id)
  if email == "" then
    logger.warn("xora_set_password no_email")
    return nk.json_encode({ ok = false })
  end

  nk.link_email(row.user_id, email, password)
  pcall(function()
    nk.session_logout(row.user_id, "", "")
  end)
  logger.info("xora_set_password updated")
  return nk.json_encode({ ok = true })
end

function InitModule(ctx, logger, nk, initializer)
  initializer.register_rpc("xora_user_by_email", rpc_user_by_email)
  initializer.register_rpc("xora_set_password", rpc_set_password)
  logger.info("XOrA recovery RPCs registered")
end
