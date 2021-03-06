
module.exports = cds.service.impl(async function () {

    const { Sales
           ,SalesOrders
          } = this.entities;

    this.after('READ', Sales, (each) => {
        if (each.amount > 500) {
            if (each.comments === null)
                each.comments = '';
            else
                each.comments += ' ';
            each.comments += 'Exceptional!';
        }
    });

    this.on('boost', async req => {
        try {
            const ID = req.params[0];
            const tx = cds.tx(req);
            await tx.update(Sales)
                .with({ amount: { '+=': 250 }, comments: 'Boosted!' })
                .where({ ID: { '=': ID } })
                ;
            return {};
        } catch (err) {
            console.error(err);
            return {};
        }
    });

    this.on('topSales', async (req) => {
        try {
            const tx = cds.tx(req);
            const results = await tx.run(`CALL "myapp.db::SP_TopSales"(?,?)`, [req.data.amount]);
            return results;
        } catch (err) {
            console.error(err);
            return {};
        }
    });

    this.on('READ', SalesOrders, async (req) => {
        try {
            const external = await cds.connect.to('API_SALES_ORDER_SRV');
            const tx = external.transaction(req);
            return await tx.send({
                query: req.query,
                headers: {
                    'APIKey': process.env.APIKey
                }
            })
        } catch (err) {
            req.reject(err);
        }
    });

    this.on('largestOrder', Sales, async (req) => {
        try {
            const tx1 = cds.tx(req);
            const res1 = await tx1.read(Sales)
                .where({ ID: { '=': req.params[0] } })
                ;
            let cql = SELECT.one(SalesOrders).where({ SalesOrganization: res1[0].org }).orderBy({ TotalNetAmount: 'desc' });
            const external = await cds.connect.to('API_SALES_ORDER_SRV');
            const tx2 = external.transaction(req);
            const res2 = await tx2.send({
                query: cql,
                headers: {
                    'APIKey': process.env.APIKey
                }
            });
            if (res2) {
                return res2.SoldToParty + ' @ ' + res2.TransactionCurrency + ' ' + Math.round(res2.TotalNetAmount).toString();
            } else {
                return 'Not found';
            }
        } catch (err) {
            req.reject(err);
        }
    });

    this.on('userInfo', req => {
        let results = {};
        results.user = req.user.id;
        if (req.user.hasOwnProperty('locale')) {
            results.locale = req.user.locale;
        }
        results.roles = {};
        results.roles.identified = req.user.is('identified-user');
        results.roles.authenticated = req.user.is('authenticated-user');
        results.roles.Viewer = req.user.is('Viewer');
        results.roles.Admin = req.user.is('Admin');
        results.attrs = {};
        if (req.user.hasOwnProperty('attr')) {
            results.attrs.Region = req.user.attr.Region;
        }
        return results;
    });

});
