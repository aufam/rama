module;

#include <jwt-cpp/jwt.h>

export module rama.jwt;

export namespace rama {
    struct JWT;
}

struct rama::JWT {
    std::string key;

    std::string encode(std::string_view username) const {
        return jwt::create()
            .set_type("JWT")
            .set_payload_claim("username", jwt::claim(std::string(username)))
            .set_expires_in(std::chrono::hours(24))
            .sign(jwt::algorithm::hs256{key});
    }

    std::pair<std::string, std::string> decode(std::string_view token) const {
        const auto verifier = jwt::verify().allow_algorithm(jwt::algorithm::hs256{std::string(key)});

        try {
            auto decoded = jwt::decode(std::string(token));
            verifier.verify(decoded);
            return {decoded.get_payload_claim("username").as_string(), ""};
        } catch (jwt::error::token_verification_exception &e) {
            return {"", e.what()};
        } catch (jwt::error::signature_verification_exception &e) {
            return {"", e.what()};
        }
    }
};
