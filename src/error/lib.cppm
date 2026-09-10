module;

#include <string>

export module rama.error;
import cpx;

export namespace rama {
    struct Error;
}

struct rama::Error {
    std::string message;
    int         status = 500;

    static constexpr std::tuple __field_tags__ = {
        cpx::field<&Error::message> = "message",
        cpx::field<&Error::status>  = "status",
    };
};
