sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, JSONModel, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("claimsure.app.controller.Dashboard", {

        onInit: function () {
            this.getView().setModel(new JSONModel({
                totalClaims: 0,
                pendingApproval: 0,
                highFraudRisk: 0,
                activePolicies: 0
            }), "dash");

            this.getView().setModel(new JSONModel([]), "recent");

            this._loadDashboardData();
        },

        _loadDashboardData: function () {
            var oModel = this.getOwnerComponent().getModel();          // insuranceService (Claims, Policies)
            var oAdminModel = this.getOwnerComponent().getModel("admin"); // mainService (Customers, ClaimTypes, Employees)

            Promise.all([
                this._loadLookupMap(oAdminModel, "/ClaimTypes", "name"),
                this._loadLookupMap(oAdminModel, "/Customers", null)
            ]).then(function (aMaps) {
                return this._loadClaims(oModel, aMaps[0], aMaps[1]);
            }.bind(this)).catch(function (oErr) {
                console.error("[Dashboard] Failed to load claims", oErr);
            });

            // High fraud risk tile: placeholder until a FraudRiskScores read is wired up.
            this.getView().getModel("dash").setProperty("/highFraudRisk", 0);

            this._loadActivePolicies(oModel);
        },

        /**
         * Generic { ID: displayValue } lookup builder against a given model/entity set.
         * sNameField is the property to use directly (e.g. "name" for ClaimTypes); pass
         * null to build a customer-style "First Last" display instead.
         * Resolves to {} (never rejects) so a missing/renamed entity set never crashes
         * the dashboard — callers just fall back to showing the raw ID.
         */
        _loadLookupMap: function (oModel, sPath, sNameField) {
            return new Promise(function (resolve) {
                if (!oModel) {
                    console.warn("[Dashboard] No model available for " + sPath);
                    resolve({});
                    return;
                }

                var oBinding = oModel.bindList(sPath, undefined, undefined, undefined, {
                    $select: sNameField ? "ID," + sNameField : "ID,firstName,lastName"
                });

                oBinding.requestContexts(0, 1000).then(function (aContexts) {
                    var mMap = {};
                    aContexts.forEach(function (oCtx) {
                        var oData = oCtx.getObject();
                        mMap[oData.ID] = sNameField
                            ? oData[sNameField]
                            : [oData.firstName, oData.lastName].filter(Boolean).join(" ");
                    });
                    resolve(mMap);
                }).catch(function (oErr) {
                    console.warn("[Dashboard] Could not load " + sPath + ", falling back to raw IDs", oErr);
                    resolve({});
                });
            });
        },

        _loadClaims: function (oModel, mClaimTypes, mCustomers) {
            var oClaimsBinding = oModel.bindList("/Claims", undefined, undefined, undefined, {
                // No $expand — customer/claimType are on a different service (admin/
                // mainService), so they can never be expanded from here regardless of
                // the nav-property name. Resolved via the lookup maps instead.
                $select: "ID,claimNumber,claimedAmount,status,customer_ID,claimType_ID",
                $orderby: "claimNumber desc"
            });

            return oClaimsBinding.requestContexts(0, 200).then(function (aContexts) {
                var aClaims = aContexts.map(function (oCtx) {
                    var oData = oCtx.getObject();
                    return Object.assign({}, oData, {
                        customerName: mCustomers[oData.customer_ID] || oData.customer_ID || "",
                        claimTypeName: mClaimTypes[oData.claimType_ID] || oData.claimType_ID || ""
                    });
                });

                var oDash = this.getView().getModel("dash");
                oDash.setProperty("/totalClaims", aClaims.length);
                oDash.setProperty("/pendingApproval", aClaims.filter(function (c) {
                    return c.status === "PendingApproval" || c.status === "UnderReview";
                }).length);

                this.getView().getModel("recent").setData(aClaims.slice(0, 5));
            }.bind(this));
        },

        _loadActivePolicies: function (oModel) {
            var oPolBinding = oModel.bindList("/Policies", undefined, undefined,
                new Filter("status", FilterOperator.EQ, "Active"),
                { $select: "ID", $$operationMode: "Server" }
            );

            oPolBinding.requestContexts(0, 500).then(function (aCtx) {
                this.getView().getModel("dash").setProperty("/activePolicies", aCtx.length);
            }.bind(this)).catch(function (oErr) {
                console.error("[Dashboard] Failed to load policies", oErr);
            });
        },

        onClaimPress: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("recent");
            var sClaimId = oCtx.getProperty("ID");
            this.getOwnerComponent().getRouter().navTo("claimDetail", { claimId: sClaimId });
        },

        onNavClaims: function () {
            this.getOwnerComponent().getRouter().navTo("claims");
        },

        onNavPolicies: function () {
            this.getOwnerComponent().getRouter().navTo("policies");
        }
    });
});