module;

#include <string>
#include <tuple>
#include <vector>

export module rama.order;
import cpx;

export namespace rama {
    struct Order;
    struct OrderItem;
    struct Customer;
} // namespace rama

struct rama::OrderItem {
    std::string product_id;
    std::string name;
    long long   price;
    std::string unit;
    long long   quantity;
    std::string notes;

    static constexpr std::tuple __field_tags__ = {
        cpx::field<&OrderItem::product_id> = "id",
        cpx::field<&OrderItem::name>       = "name",
        cpx::field<&OrderItem::price>      = "price",
        cpx::field<&OrderItem::unit>       = "unit",
        cpx::field<&OrderItem::quantity>   = "quantity",
        cpx::field<&OrderItem::notes>      = "notes",
    };
};

struct rama::Customer {
    std::string id;
    std::string name;
    std::string phone;
    std::string address;
    std::string notes;

    static constexpr std::tuple __field_tags__ = {
        cpx::field<&Customer::id>      = "id",
        cpx::field<&Customer::name>    = "name",
        cpx::field<&Customer::phone>   = "phone",
        cpx::field<&Customer::address> = "address",
        cpx::field<&Customer::notes>   = "notes",
    };
};

struct rama::Order {
    std::string            id;
    std::string            created_at;
    std::string            updated_at;
    std::string            status;
    Customer               customer;
    std::vector<OrderItem> items;
    long long              total_count;
    long long              total_price;

    static constexpr std::tuple __field_tags__ = {
        cpx::field<&Order::id>          = "id,skipmissing,omitempty",
        cpx::field<&Order::created_at>  = "createdAt",
        cpx::field<&Order::updated_at>  = "updatedAt",
        cpx::field<&Order::status>      = "status",
        cpx::field<&Order::customer>    = "customer",
        cpx::field<&Order::items>       = "items",
        cpx::field<&Order::total_count> = "totalCount",
        cpx::field<&Order::total_price> = "totalPrice",
    };

    void create();
};
