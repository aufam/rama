module;

#include <string>
#include <vector>
#include <tuple>

export module rama.banner;
import cpx;

export namespace rama {
    struct Banner;
}

struct rama::Banner {
    std::vector<std::string> landscape;
    std::vector<std::string> square1;
    std::vector<std::string> square2;

    static constexpr std::tuple __field_tags__ = {
        cpx::field<&Banner::landscape> = "landscape",
        cpx::field<&Banner::square1>   = "square1",
        cpx::field<&Banner::square2>   = "square2",
    };
};
