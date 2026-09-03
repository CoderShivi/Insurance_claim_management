sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, JSONModel, Filter, FilterOperator) {
    "use strict";

    // Central color map so bars, pie chart and legend all use the same hex values
    var STATE_COLORS = {
        Success: "#1D9E75",
        Warning: "#EF9F27",
        Error:   "#D85A30",
        None:    "#7F77DD"
    };
    var STATUS_COLORS = {
    "Rejected":               "#D85A30", // red-orange
    "Approved":                "#1D9E75", // green
    "Paid":                     "#2FA8A0", // teal
    "Pending / review":         "#EF9F27", // amber
    "InvestigationRequired":    "#7F77DD", // purple
    "Submitted":                "#3E7CB1"  // blue
    };
    var FALLBACK_PALETTE = ["#D85A30", "#1D9E75", "#2FA8A0", "#EF9F27", "#7F77DD", "#3E7CB1", "#C2571F", "#4C6EF5"];
    return Controller.extend("claimsure.app.controller.Dashboard", {

        onInit: function () {
            this.getView().setModel(new JSONModel({
                totalClaims: 0,
                pendingApproval: 0,
                highFraudRisk: 0,
                activePolicies: 0
            }), "dash");

            this.getView().setModel(new JSONModel([]), "recent");

            // statusChart model now holds { items: [...], pieBackground: "conic-gradient(...)" }
            this.getView().setModel(new JSONModel({ items: [], pieBackground: "" }), "statusChart");
            this.getView().setModel(new JSONModel({ items: [] }), "policyChart");
            this.getView().setModel(new JSONModel({ items: [] }), "policyTypeChart");
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

            this._loadFraudRisk(oModel);
            this._loadActivePolicies(oModel);
            // FIX — this was defined but never invoked, which is why
            // "Policies by status" always rendered "No data".
            this._loadPolicyStatusChart(oModel);
            this._loadPolicyTypeChart(oModel, oAdminModel);
        },


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

                this._buildStatusChart(aClaims);

                // FIX — this populated the "recent" model, but nothing in the view
                // was bound to it. See the "Recent claims" panel added back below.
                this.getView().getModel("recent").setData(aClaims.slice(0, 5));
            }.bind(this));
        },

_buildStatusChart: function (aClaims) {
    var mStatusCounts = {};
    aClaims.forEach(function (c) {
        var sKey = (c.status === "PendingApproval" || c.status === "UnderReview")
            ? "Pending / review"
            : c.status;
        mStatusCounts[sKey] = (mStatusCounts[sKey] || 0) + 1;
    });

    var iTotal = aClaims.length || 1;
    var aCounts = Object.keys(mStatusCounts).map(function (k) { return mStatusCounts[k]; });
    var iMax = aCounts.length ? Math.max.apply(null, aCounts) : 1;

    var fCursor = 0;
    var aItems = Object.keys(mStatusCounts).map(function (sStatus, iIndex) {
        var iCount = mStatusCounts[sStatus];
        var sState = sStatus === "Rejected" ? "Error"
                   : sStatus === "Approved" || sStatus === "Paid" ? "Success"
                   : sStatus === "Pending / review" ? "Warning"
                   : "None";

        var sColor = STATUS_COLORS[sStatus] || FALLBACK_PALETTE[iIndex % FALLBACK_PALETTE.length];

        var fShare = (iCount / iTotal) * 100;
        var iPct = Math.round((iCount / iMax) * 100);
        var oItem = {
            status: sStatus,
            count: iCount,
            percent: iPct,
            percentOfTotal: Math.round(fShare),
            state: sState,
            color: sColor,
            barHtml: this.formatStatusBarHtml(iPct, sColor),
            startAngle: fCursor * 3.6,
            endAngle: (fCursor + fShare) * 3.6
        };
        fCursor += fShare;
        return oItem;
    }.bind(this));

    var aStops = aItems.map(function (oItem) {
        return oItem.color + " " + (oItem.startAngle / 3.6).toFixed(2) + "% " + (oItem.endAngle / 3.6).toFixed(2) + "%";
    });
    var sPieBackground = aStops.length
        ? "conic-gradient(" + aStops.join(", ") + ")"
        : "conic-gradient(#EDEDE8 0% 100%)";

    this.getView().getModel("statusChart").setData({
        items: aItems,
        pieBackground: sPieBackground,
        selectedLabel: ""
    });
},

onPieChartPress: function (oEvent) {
    var oDomRef = oEvent.getSource().getDomRef
        ? oEvent.getSource().getDomRef().querySelector(".pieChart")
        : null;

    if (!oDomRef) { return; }

    var oRect = oDomRef.getBoundingClientRect();
    var fCenterX = oRect.left + oRect.width / 2;
    var fCenterY = oRect.top + oRect.height / 2;

    var fClickX = oEvent.originalEvent ? oEvent.originalEvent.clientX : oEvent.clientX;
    var fClickY = oEvent.originalEvent ? oEvent.originalEvent.clientY : oEvent.clientY;

    var fDx = fClickX - fCenterX;
    var fDy = fClickY - fCenterY;

    var fAngle = (Math.atan2(fDy, fDx) * 180 / Math.PI) + 90;
    if (fAngle < 0) { fAngle += 360; }

    var oModel = this.getView().getModel("statusChart");
    var aItems = oModel.getProperty("/items");

    var oMatch = aItems.find(function (oItem) {
        return fAngle >= oItem.startAngle && fAngle < oItem.endAngle;
    });

    oModel.setProperty("/selectedLabel", oMatch ? (oMatch.status + " — " + oMatch.count + " claims (" + oMatch.percentOfTotal + "%)") : "");
},


        formatStatusBarHtml: function (iPercent, sColor) {
            var iPct = iPercent || 0;
            var sSafeColor = sColor || STATE_COLORS.None;
            return "<div style=\"height:100%;border-radius:4px;width:" + iPct + "%;background:" + sSafeColor + ";\"></div>";
        },

        // Builds the pie <div> plus one absolutely-positioned label per slice,
// placed at the mid-angle of that slice, so it's clear which name
// belongs to which colored wedge.
formatPieChartHtml: function (aItems, sPieBackground) {
    if (!aItems || !aItems.length) {
        return "<div class=\"pieChart\" style=\"background:conic-gradient(#EDEDE8 0% 100%)\"></div>";
    }

    var aLabels = aItems.map(function (oItem) {
        // Skip labels for very thin slices to avoid text overlap
        if (oItem.percentOfTotal < 6) { return ""; }

        var fMidAngle = (oItem.startAngle + oItem.endAngle) / 2;
        var fRad = fMidAngle * Math.PI / 180;
        var fRadiusFraction = 0.66; // 0 = center, 1 = edge of circle

        var fLeft = 50 + fRadiusFraction * 50 * Math.sin(fRad);
        var fTop  = 50 - fRadiusFraction * 50 * Math.cos(fRad);

        return "<span class=\"pieSliceLabel\" style=\"left:" + fLeft.toFixed(2)
            + "%;top:" + fTop.toFixed(2) + "%;\">" + oItem.status + "</span>";
    }).join("");

    return "<div class=\"pieChart\" style=\"background:" + sPieBackground + "\">" + aLabels + "</div>";
},

// FIX — this was referenced by the view (formatter: '.formatLegendListHtml')
// but never existed, so the space beside the pie chart was always empty.
// This builds one row per status with a color dot, name, % share and count —
// which is the "number of claims beside the pie chart" you were expecting.
formatLegendListHtml: function (aItems) {
    if (!aItems || !aItems.length) {
        return "<div class=\"legendEmpty\">No data</div>";
    }

    return aItems.map(function (oItem) {
        return "<div class=\"legendRow\" style=\"display:flex;align-items:center;\">"
            + "<span class=\"legendDot\" style=\"background:" + oItem.color + ";\"></span>"
            + "<span class=\"legendLabel\">" + oItem.status + "</span>"
            + "<span class=\"legendPercent\">" + oItem.percentOfTotal + "%</span>"
            + "</div>";
    }).join("");
},

        _loadFraudRisk: function (oModel) {
            if (!oModel) {
                console.warn("[Dashboard] No model available for FraudRiskScores");
                return;
            }

            var oBinding = oModel.bindList("/FraudRiskScores", undefined, undefined,
                new Filter("riskLevel", FilterOperator.EQ, "High"),
                { $select: "ID", $$operationMode: "Server" }
            );

            oBinding.requestContexts(0, 500).then(function (aCtx) {
                this.getView().getModel("dash").setProperty("/highFraudRisk", aCtx.length);
            }.bind(this)).catch(function (oErr) {
                console.warn("[Dashboard] FraudRiskScores not available, leaving highFraudRisk at 0", oErr);
            });
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

// Loads all policies (not just Active) so we can break them down by status
_loadPolicyStatusChart: function (oModel) {
    if (!oModel) {
        console.warn("[Dashboard] No model available for Policies");
        return;
    }

    var oBinding = oModel.bindList("/Policies", undefined, undefined, undefined, {
        $select: "ID,status"
    });

    oBinding.requestContexts(0, 500).then(function (aContexts) {
        var aPolicies = aContexts.map(function (oCtx) {
            return oCtx.getObject();
        });
        this._buildPolicyStatusChart(aPolicies);
    }.bind(this)).catch(function (oErr) {
        console.error("[Dashboard] Failed to load policy status chart", oErr);
    });
},

// Same grouping pattern as _buildStatusChart, but for policies
_buildPolicyStatusChart: function (aPolicies) {
    var mStatusCounts = {};
    aPolicies.forEach(function (p) {
        var sKey = p.status || "Unknown";
        mStatusCounts[sKey] = (mStatusCounts[sKey] || 0) + 1;
    });

    var iTotal = aPolicies.length || 1;
    var aCounts = Object.keys(mStatusCounts).map(function (k) { return mStatusCounts[k]; });
    var iMax = aCounts.length ? Math.max.apply(null, aCounts) : 1;

    var aItems = Object.keys(mStatusCounts).map(function (sStatus, iIndex) {
        var iCount = mStatusCounts[sStatus];
        var sColor = STATUS_COLORS[sStatus] || FALLBACK_PALETTE[iIndex % FALLBACK_PALETTE.length];
        var iPct = Math.round((iCount / iMax) * 100);
        return {
            status: sStatus,
            count: iCount,
            percent: iPct,
            percentOfTotal: Math.round((iCount / iTotal) * 100),
            color: sColor,
            // FIX — computed here (controller) instead of via a multi-part
            // relative binding in the view, which was not resolving reliably.
            barHtml: this.formatStatusBarHtml(iPct, sColor)
        };
    }.bind(this));

    this.getView().getModel("policyChart").setData({ items: aItems });
},

// FIXED — Policies has no "type" field; it has a claimType ASSOCIATION to
// ClaimTypes. Resolve claimType_ID -> ClaimTypes.name via a lookup map
// (same pattern _loadClaims already uses), then group by that name.
_loadPolicyTypeChart: function (oModel, oAdminModel) {
    if (!oModel) {
        console.warn("[Dashboard] No model available for Policies (type breakdown)");
        return;
    }

    this._loadLookupMap(oAdminModel, "/ClaimTypes", "name").then(function (mClaimTypes) {
        var oBinding = oModel.bindList("/Policies", undefined, undefined, undefined, {
            $select: "ID,claimType_ID"
        });

        return oBinding.requestContexts(0, 500).then(function (aContexts) {
            var aPolicies = aContexts.map(function (oCtx) {
                var oData = oCtx.getObject();
                return {
                    type: mClaimTypes[oData.claimType_ID] || oData.claimType_ID || "Unknown"
                };
            });
            this._buildPolicyTypeChart(aPolicies);
        }.bind(this));
    }.bind(this)).catch(function (oErr) {
        console.error("[Dashboard] Failed to load policy type chart", oErr);
    });
},

// Same grouping pattern as _buildPolicyStatusChart, sorted largest-first
_buildPolicyTypeChart: function (aPolicies) {
    var mCounts = {};
    aPolicies.forEach(function (p) {
        var sKey = p.type || "Unknown";
        mCounts[sKey] = (mCounts[sKey] || 0) + 1;
    });

    var iTotal = aPolicies.length || 1;
    var aItems = Object.keys(mCounts).map(function (sType, iIndex) {
        var iCount = mCounts[sType];
        var sColor = FALLBACK_PALETTE[iIndex % FALLBACK_PALETTE.length];
        var iPct = Math.round((iCount / iTotal) * 100);
        return {
            type: sType,
            count: iCount,
            percentOfTotal: iPct,
            color: sColor,
            // FIX — same reasoning as _buildPolicyStatusChart above
            barHtml: this.formatStatusBarHtml(iPct, sColor)
        };
    }.bind(this)).sort(function (a, b) { return b.count - a.count; });

    this.getView().getModel("policyTypeChart").setData({ items: aItems });
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
        },

        onNavAdministration: function () {
            // NOTE: verify this route name matches the one in manifest.json's
            // "routing/routes" section (the URL you shared uses "#/admin", so
            // "admin" is the most likely route name — adjust if yours differs).
            this.getOwnerComponent().getRouter().navTo("admin");
        }
    });
});