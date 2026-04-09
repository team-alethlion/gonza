now i am seeing this error

## Error Type

Console Error

## Error Message

Unauthorized: You do not have access to this branch

    at createPayment (src/hooks/useInstallmentPayments.ts:78:50)
    at async useCashTransactionOperations.useCallback[createInstallmentPaymentWithCash] [as createInstallmentPaymentWithCash] (src/hooks/useCashTransactionOperations.ts:130:55)
    at async handleSubmit (src/hooks/sale-form/useSaleSubmit.ts:219:11)

## Code Frame

76 | });
77 |

> 78 | if (!result.success || !result.data) throw new Error(result.error);

     |                                                  ^

79 |
80 | const newPayment: InstallmentPayment = {
81 | ...result.data,

Next.js version: 16.1.6 (Turbopack)

this is what is happening.
whan i fill all details with in the new sale page and choose installment sale, have filled in all details ie Amount Paid (Current Payment) and amount due has properly been computed even when it comes to the receipt preview modal

but when i click create sale button first i see the message failed to create sale
and this error (## Error Type
Console Error

## Error Message

Unauthorized: You do not have access to this branch

    at createPayment (src/hooks/useInstallmentPayments.ts:78:50)
    at async useCashTransactionOperations.useCallback[createInstallmentPaymentWithCash] [as createInstallmentPaymentWithCash] (src/hooks/useCashTransactionOperations.ts:130:55)
    at async handleSubmit (src/hooks/sale-form/useSaleSubmit.ts:219:11)

## Code Frame

76 | });
77 |

> 78 | if (!result.success || !result.data) throw new Error(result.error);

     |                                                  ^

79 |
80 | const newPayment: InstallmentPayment = {
81 | ...result.data,

Next.js version: 16.1.6 (Turbopack)
) then after a few seconds i see sale create succesfully.

these are the logs

frontend([Middleware] CHECK -> Path: /agency/new-sale, User: gajelad554@lxbeta.com, Role: admin, Status: ACTIVE, Onboarded: true, Sub: active
POST /agency/new-sale?defaultPaymentStatus=Paid 200 in 548ms (compile: 40ms, proxy.ts: 278ms, render: 230ms)
[Middleware] CHECK -> Path: /agency/new-sale, User: gajelad554@lxbeta.com, Role: admin, Status: ACTIVE, Onboarded: true, Sub: active
[StrictGuard] Final Verification: - Status: active - Result: PASS

[PERF] AppInit starting for user us-dbyi920rpietvypwkdce4rl0 (admin)
[Middleware] CHECK -> Path: /agency/new-sale, User: gajelad554@lxbeta.com, Role: admin, Status: ACTIVE, Onboarded: true, Sub: active
[AuthGuard] Access Denied: User gajelad554@lxbeta.com (Role: admin) attempted to access branch undefined
POST /agency/new-sale?defaultPaymentStatus=Paid 200 in 202ms (compile: 34ms, proxy.ts: 86ms, render: 82ms)
[PERF] AppInit (Full Optimized Shell) took 374ms
[Middleware] CHECK -> Path: /agency/new-sale, User: gajelad554@lxbeta.com, Role: admin, Status: ACTIVE, Onboarded: true, Sub: active
POST /agency/new-sale?defaultPaymentStatus=Paid 200 in 1431ms (compile: 9ms, proxy.ts: 20ms, render: 1403ms)
POST /agency/new-sale?defaultPaymentStatus=Paid 200 in 656ms (compile: 195ms, proxy.ts: 315ms, render: 145ms)
[Middleware] CHECK -> Path: /agency/new-sale, User: gajelad554@lxbeta.com, Role: admin, Status: ACTIVE, Onboarded: true, Sub: active
[ServerAction] 📥 Received Delta Sync Request for Branch: br-x74tzb48dl6cwzlx6hvldn7j Since: 1775737647860
POST /agency/new-sale?defaultPaymentStatus=Paid 200 in 79ms (compile: 8ms, proxy.ts: 17ms, render: 54ms)

)
backend([09/Apr/2026 15:27:48] "GET /api/sales/sales/next_receipt_number/?branchId=br-x74tzb48dl6cwzlx6hvldn7j HTTP/1.1" 200 34
DEBUG: Creating sale. Status: INSTALLMENT, Items count: 1
DEBUG: Processing inventory for Sale #GZ-JVS-2604-0010. Items count: 1
DEBUG: Item 0 productId: pr-uif8sfm1ka06mndndzger26g, quantity: 5
DEBUG: Found product G-shock-500 (ID: pr-uif8sfm1ka06mndndzger26g). Current stock: 144
DEBUG: Updated G-shock-500 stock: 144 -> 139
[09/Apr/2026 15:27:48] "POST /api/sales/sales/ HTTP/1.1" 201 1374
[09/Apr/2026 15:27:48] "GET /api/core/branches/ HTTP/1.1" 200 1779
[09/Apr/2026 15:27:49] "GET /api/core/settings/?branchId=br-x74tzb48dl6cwzlx6hvldn7j HTTP/1.1" 200 542
[09/Apr/2026 15:27:49] "GET /api/users/users/me/ HTTP/1.1" 200 3160
[09/Apr/2026 15:27:49] "GET /api/users/users/?branchId=br-x74tzb48dl6cwzlx6hvldn7j HTTP/1.1" 200 3212
[09/Apr/2026 15:27:49] "GET /api/finance/accounts/?branchId=br-x74tzb48dl6cwzlx6hvldn7j HTTP/1.1" 200 789
[09/Apr/2026 15:27:49] "GET /api/sales/categories/?branchId=br-x74tzb48dl6cwzlx6hvldn7j HTTP/1.1" 200 292
[09/Apr/2026 15:27:49] "GET /api/customers/customers/?branchId=br-x74tzb48dl6cwzlx6hvldn7j&limit=100&offset=0 HTTP/1.1" 200 1547
[09/Apr/2026 15:27:49] "GET /api/finance/transactions/?branch_id=br-x74tzb48dl6cwzlx6hvldn7j&limit=50&offset=0 HTTP/1.1" 200 52
[09/Apr/2026 15:27:49] "GET /api/customers/categories/?branchId=br-x74tzb48dl6cwzlx6hvldn7j HTTP/1.1" 200 566
[09/Apr/2026 15:27:49] "GET /api/inventory/producthistory/?locationId=br-x74tzb48dl6cwzlx6hvldn7j HTTP/1.1" 200 11970
[09/Apr/2026 15:27:49] "GET /api/messaging/messages/?userId=us-dbyi920rpietvypwkdce4rl0&locationId=br-x74tzb48dl6cwzlx6hvldn7j HTTP/1.1" 200 52
[09/Apr/2026 15:27:49] "GET /api/messaging/templates/?userId=us-dbyi920rpietvypwkdce4rl0&locationId=br-x74tzb48dl6cwzlx6hvldn7j HTTP/1.1" 200 52
[09/Apr/2026 15:27:49] "POST /api/core/activity-history/ HTTP/1.1" 201 631
[09/Apr/2026 15:27:57] "GET /api/inventory/products/delta/?branch_id=br-x74tzb48dl6cwzlx6hvldn7j&since=1775737647860 HTTP/1.1" 200 601

)

then i also noticed that the final preview receipt modal does not have installment sale values ie amount paid and amount due it looks like it defaulted to paid as i only see total
