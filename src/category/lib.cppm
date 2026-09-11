module;

#include <string>
#include <tuple>

export module rama.category;
import cpx;

export namespace rama {
    struct Category;
}

struct rama::Category {
    std::string id;
    std::string name;
    std::string icon;
    long long   priority = 0;

    static constexpr std::tuple __field_tags__ = {
        cpx::field<&Category::id>       = "id",
        cpx::field<&Category::name>     = "name",
        cpx::field<&Category::icon>     = "icon",
        cpx::field<&Category::priority> = "icon,skipmissing",
    };
};
