from django.db import connection
from datetime import datetime
from decimal import Decimal

def get_stock_summary_data(branch_id, start_date, end_date):
    """
    Modular logic to calculate Stock Summary metrics (Opening, In, Out, Closing)
    including both Quantities and Monetary Values (Quantity * Cost).
    """
    query = """
        WITH OpeningStock AS (
            SELECT 
                p.id as product_id,
                COALESCE((
                    SELECT h.new_stock 
                    FROM inventory_producthistory h 
                    WHERE h.product_id = p.id AND h.created_at < %s 
                    ORDER BY h.created_at DESC, h.id DESC 
                    LIMIT 1
                ), 0) as "openingStock"
            FROM inventory_product p
            WHERE p.branch_id = %s
        ),
        ProductMetrics AS (
            SELECT 
                "product_id",
                SUM(CASE WHEN "type" = 'SALE' THEN ABS("quantity_change") ELSE 0 END) as "itemsSold",
                SUM(CASE WHEN "type" IN ('STOCK_IN', 'RESTOCK', 'CREATED') THEN ABS("quantity_change") ELSE 0 END) as "stockIn",
                SUM(CASE WHEN "type" = 'RETURN_IN' THEN ABS("quantity_change") ELSE 0 END) as "returnIn",
                SUM(CASE WHEN "type" = 'RETURN_OUT' THEN ABS("quantity_change") ELSE 0 END) as "returnOut",
                SUM(CASE WHEN "type" = 'TRANSFER_OUT' THEN ABS("quantity_change") ELSE 0 END) as "transferOut",
                SUM(CASE WHEN "quantity_change" > 0 AND "type" NOT IN ('STOCK_IN', 'RESTOCK', 'CREATED', 'SALE', 'RETURN_IN', 'RETURN_OUT', 'TRANSFER_OUT') THEN "quantity_change" ELSE 0 END) as "adjustmentsIn",
                SUM(CASE WHEN "quantity_change" < 0 AND "type" NOT IN ('STOCK_IN', 'RESTOCK', 'CREATED', 'SALE', 'RETURN_IN', 'RETURN_OUT', 'TRANSFER_OUT') THEN ABS("quantity_change") ELSE 0 END) as "adjustmentsOut"
            FROM inventory_producthistory
            WHERE branch_id = %s AND created_at BETWEEN %s AND %s
            GROUP BY "product_id"
        ),
        ClosingStock AS (
            SELECT 
                p.id as product_id,
                COALESCE((
                    SELECT h.new_stock 
                    FROM inventory_producthistory h 
                    WHERE h.product_id = p.id AND h.created_at <= %s 
                    ORDER BY h.created_at DESC, h.id DESC 
                    LIMIT 1
                ), p.initial_stock) as "closingStock"
            FROM inventory_product p
            WHERE p.branch_id = %s
        )
        SELECT 
            p.id as "productId",
            p.name as "productName",
            p.sku as "itemNumber",
            p.image_url as "imageUrl",
            p.cost_price as "costPrice",
            p.selling_price as "sellingPrice",
            c.name as "category",
            COALESCE(os."openingStock", 0) as "openingStock",
            COALESCE(cs."closingStock", os."openingStock", 0) as "closingStock",
            COALESCE(pm."itemsSold", 0) as "itemsSold",
            COALESCE(pm."stockIn", 0) as "stockIn",
            COALESCE(pm."returnIn", 0) as "returnIn",
            COALESCE(pm."returnOut", 0) as "returnOut",
            COALESCE(pm."transferOut", 0) as "transferOut",
            COALESCE(pm."adjustmentsIn", 0) as "adjustmentsIn",
            COALESCE(pm."adjustmentsOut", 0) as "adjustmentsOut"
        FROM inventory_product p
        LEFT JOIN inventory_category c ON p.category_id = c.id
        LEFT JOIN OpeningStock os ON p.id = os.product_id
        LEFT JOIN ProductMetrics pm ON p.id = pm."product_id"
        LEFT JOIN ClosingStock cs ON p.id = cs.product_id
        WHERE p.branch_id = %s
    """
    
    with connection.cursor() as cursor:
        cursor.execute(query, [start_date, branch_id, branch_id, start_date, end_date, end_date, branch_id, branch_id])
        columns = [col[0] for col in cursor.description]
        db_results = [dict(zip(columns, row)) for row in cursor.fetchall()]

    formatted_items = []
    summary = {
        "totalOpeningStock": 0,
        "totalOpeningStockValue": 0,
        "totalStockIn": 0,
        "totalStockInValue": 0,
        "totalItemsSold": 0,
        "totalItemsSoldValue": 0,
        "totalAdjustmentsIn": 0,
        "totalAdjustmentsOut": 0,
        "totalAdjustmentsOutValue": 0,
        "totalClosingStock": 0,
        "totalClosingStockValue": 0,
        "totalReturnIn": 0,
        "totalReturnInValue": 0,
        "totalReturnOut": 0,
        "totalReturnOutValue": 0,
        "totalTransferOut": 0,
        "totalTransferOutValue": 0,
        "totalRevaluation": 0
    }

    for row in db_results:
        # 🛡️ Hardened float conversion
        def to_f(v):
            try: return float(v or 0)
            except: return 0.0

        cp = to_f(row.get('costPrice'))
        op_qty = to_f(row.get('openingStock'))
        in_qty = to_f(row.get('stockIn'))
        sold_qty = to_f(row.get('itemsSold'))
        ret_in_qty = to_f(row.get('returnIn'))
        ret_out_qty = to_f(row.get('returnOut'))
        trans_out_qty = to_f(row.get('transferOut'))
        adj_out_qty = to_f(row.get('adjustmentsOut'))
        cl_qty = to_f(row.get('closingStock'))

        # Metrics
        reval = cl_qty * cp

        formatted_items.append({
            "productId": row.get('productId'),
            "productName": row.get('productName'),
            "itemNumber": row.get('itemNumber') or row.get('productId'),
            "imageUrl": row.get('imageUrl'),
            "costPrice": cp,
            "sellingPrice": to_f(row.get('sellingPrice')),
            "category": row.get('category'),
            "openingStock": op_qty,
            "itemsSold": sold_qty,
            "stockIn": in_qty,
            "transferOut": trans_out_qty,
            "returnIn": ret_in_qty,
            "returnOut": ret_out_qty,
            "adjustmentsIn": to_f(row.get('adjustmentsIn')),
            "adjustmentsOut": adj_out_qty,
            "closingStock": cl_qty,
            "revaluation": reval
        })

        # Update Summary Quantities
        summary["totalOpeningStock"] += op_qty
        summary["totalStockIn"] += in_qty
        summary["totalItemsSold"] += sold_qty
        summary["totalReturnIn"] += ret_in_qty
        summary["totalReturnOut"] += ret_out_qty
        summary["totalTransferOut"] += trans_out_qty
        summary["totalAdjustmentsOut"] += adj_out_qty
        summary["totalClosingStock"] += cl_qty
        summary["totalRevaluation"] += reval

        # Update Summary VALUES
        summary["totalOpeningStockValue"] += (op_qty * cp)
        summary["totalStockInValue"] += (in_qty * cp)
        summary["totalItemsSoldValue"] += (sold_qty * cp)
        summary["totalReturnInValue"] += (ret_in_qty * cp)
        summary["totalReturnOutValue"] += (ret_out_qty * cp)
        summary["totalTransferOutValue"] += (trans_out_qty * cp)
        summary["totalAdjustmentsOutValue"] += (adj_out_qty * cp)
        summary["totalClosingStockValue"] += (cl_qty * cp)

    return {
        "items": formatted_items,
        "summary": summary
    }
