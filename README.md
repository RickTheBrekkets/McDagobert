# McDagobert

Simple web application to optimise a group McDonald's order.

## Usage

Open `public/index.html` in a browser. Add one or more people with their
desired items. When you click **Compute Cheapest Order**, the application
calculates the cheapest combination of menus and single items using the prices
in `public/price-list.json`.

The output shows:

- The total cost of the optimised order
- The savings compared to buying every item separately
- Each person's items and whether the item comes from a combo or a single
  purchase

The price list and combo deals can be modified in `public/price-list.json`.

For a simplified demo styled with Tailwind CSS, you can also open
`public/mcsavings.html` which contains everything in a single file and uses a
placeholder algorithm to pick random deals.
