module;

#include <string>
#include <tuple>

export module rama.product;
import cpx;

export namespace rama {
    struct Product;
}

struct rama::Product {
    std::string id;
    std::string name;
    std::string barcode;
    long long   price;
    long long   discount;
    long long   sale_price;
    std::string category;
    std::string unit;
    std::string image;
    std::string description;

    static constexpr std::tuple __field_tags__ = {
        cpx::field<&Product::id>          = "id",
        cpx::field<&Product::name>        = "name",
        cpx::field<&Product::barcode>     = "barcode",
        cpx::field<&Product::price>       = "price",
        cpx::field<&Product::discount>    = "discount",
        cpx::field<&Product::sale_price>  = "salePrice",
        cpx::field<&Product::category>    = "category",
        cpx::field<&Product::unit>        = "unit",
        cpx::field<&Product::image>       = "image",
        cpx::field<&Product::description> = "description",
    };
};
