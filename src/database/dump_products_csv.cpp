module;

#include <string>
#include <csv.hpp>
#include <mutex>

module rama;
import rama.database;
import rama.error;
import fmt;

namespace sql = cpx::sql;

void write_csv_field(std::ostream &out, std::string_view value) {
    const bool quote = value.find_first_of(",\"\r\n") != std::string_view::npos;

    if (!quote) {
        out << value;
        return;
    }

    out << '"';
    for (const char c : value) {
        if (c == '"')
            out << "\"\"";
        else
            out << c;
    }
    out << '"';
}

void write_csv_row(std::ostream &out, std::initializer_list<std::string_view> fields) {
    std::string row;

    for (const auto field : fields) {
        if (!row.empty())
            row += ',';

        const bool quote = field.find_first_of(",\"\r\n") != std::string_view::npos;

        if (!quote) {
            row += field;
            continue;
        }

        row += '"';

        for (const char c : field) {
            if (c == '"')
                row += "\"\"";
            else
                row += c;
        }

        row += '"';
    }

    row += '\n';
    out.write(row.data(), row.size());
}

std::string int_to_rupiah(long long value) {
    const bool  negative = value < 0;
    std::string digits   = std::to_string(negative ? -value : value);

    std::string result;
    result.reserve(digits.size() + digits.size() / 3 + 3);

    for (std::size_t i = 0; i < digits.size(); ++i) {
        if (i > 0 && (digits.size() - i) % 3 == 0)
            result += ',';

        result += digits[i];
    }

    result += ".00";

    if (negative)
        result.insert(0, 1, '-');

    result.insert(0, 1, ' ');
    result += ' ';
    return result;
}

void rama::App::dump_products_csv(const std::string &path) {
    std::lock_guard<std::mutex> lock(mtx);

    static constexpr rama::database::Product products;

    std::ofstream out(path);

    if (!out)
        throw Error{.message = fmt::format("cannot open {:?} for writing", path), .status = 400};

    write_csv_row(
        out,
        {"KODE_BRG",
         "NAMA_BRG",
         "BARCODE",
         "HARGA SBLM DISKON",
         "DISC_JUAL",
         "HARGA SDH DISKON",
         "KATEGORI",
         "UNIT",
         "GAMBAR",
         "DESKRIPSI"}
    );

    auto stmt = sql::select(
                    products.id,
                    products.name,
                    products.barcode,
                    products.price,
                    products.discount,
                    products.sale_price,
                    products.category_id,
                    products.unit,
                    products.image,
                    products.description
    )
                    .from(products)
                    .order_by(products.name);

    for (auto row = db(stmt); !row.is_done(); row.next()) {
        const auto [id, name, barcode, price, discount, sale_price, category, unit, image, description] = row.get();

        auto sprice    = int_to_rupiah(price);
        auto sdiscount = fmt::format("{}", discount);
        auto ssale     = int_to_rupiah(sale_price);

        write_csv_row(out, {id, name, barcode, sprice, sdiscount, ssale, category, unit, image, description});
    }
}
