import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
const urlParams = new URLSearchParams(window.location.search);
const USERID = urlParams.get('i');

// --- HELPER: Refresh User Balance UI ---
// This calls the function in your app.js to update the top cards
const refreshUI = () => {
    if (typeof fetchUserData === 'function') fetchUserData();
};

// ==========================================
// 1. DEPOSIT APPROVAL (Table: pendingDeposit)
// ==========================================
export async function loadDepositApprovalTable() {
    const tableBody = document.getElementById("cvcx3");
    if (!tableBody || !USERID) return;
    tableBody.innerHTML = "";

    const { data, error } = await supabase
        .from('pendingDeposit')
        .select('*')
        .eq('uuid', USERID)
        .order('created_at', { ascending: false });

    if (error) return console.error('Deposit Fetch Error:', error.message);

    const currency = localStorage.getItem("currency") || "$";
    data.forEach(doc => {
        const row = `
            <tr>
                <td>#${doc.id}</td>
                <td>${doc.date}</td>
                <td>${doc.address}</td>
                <td>${doc.crypto}</td>
                <td>${currency}${doc.amount}</td>
                <td><a href="${doc.imageProf}" target="_blank" class="btn btn-sm btn-light-primary">View Proof</a></td>
                <td><span class="badge ${doc.status === 'Pending' ? 'bg-warning' : 'bg-success'}">${doc.status}</span></td>
                <td><button class="btn btn-success btn-sm" onclick="handleApproveDeposit('${doc.id}')">Approve</button></td>
                <td><button class="btn btn-danger btn-sm" onclick="handleDeleteDeposit('${doc.id}')">Delete</button></td>
            </tr>`;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

window.handleApproveDeposit = async (id) => {
    if (!confirm("Approve this deposit and add to user balance?")) return;

    if (typeof window.showSpinnerModal === 'function') window.showSpinnerModal();

    try {
        // 1. Fetch the request details to get the amount
        const { data: request, error: fetchErr } = await supabase
            .from('pendingDeposit')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchErr) throw fetchErr;

        // 2. Fetch current profile values
        const { data: profile, error: profileErr } = await supabase
            .from('user_profiles')
            .select('account_balance, totaldeposit, pendingdeposit')
            .eq('uuid', USERID)
            .single();
        if (profileErr) throw profileErr;

        const amountNum = Number(request.amount) || 0;

        // 3. Calculate new values: Add to balance/total, Subtract from pending
        const newBalance = (Number(profile.account_balance) || 0) + amountNum;
        const newTotalDep = (Number(profile.totaldeposit) || 0) + amountNum;
        let newPending = (Number(profile.pendingdeposit) || 0) - amountNum;
        if (newPending < 0) newPending = 0; // Safety floor

        // 4. Update User Profile
        const { error: updateErr } = await supabase
            .from('user_profiles')
            .update({
                account_balance: newBalance,
                totaldeposit: newTotalDep,
                pendingdeposit: newPending
            })
            .eq('uuid', USERID);
        if (updateErr) throw updateErr;

        // 5. Move to history and delete from pendingDeposit
        await supabase.from('history').insert([{
            uuid: USERID, amount: request.amount, address: request.address,
            date: request.date, cryptoCurrnecy: request.crypto, status: 'Complete'
        }]);
        await supabase.from('pendingDeposit').delete().eq('id', id);

        alert("Deposit Approved and Balances Updated!");
        loadDepositApprovalTable();
        if (typeof loadDepositHistory === 'function') loadDepositHistory(0);
        if (typeof fetchUserData === 'function') fetchUserData();

    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        if (typeof window.hideSpinnerModal === 'function') window.hideSpinnerModal();
    }
};

window.handleDeleteDeposit = async (id) => {
    if (!confirm("Reject and delete this deposit request? This will remove the amount from the user's pending balance.")) return;

    if (typeof window.showSpinnerModal === 'function') window.showSpinnerModal();

    try {
        // 1. Get the request to find the amount
        const { data: request, error: fetchErr } = await supabase
            .from('pendingDeposit')
            .select('amount')
            .eq('id', id)
            .single();
        if (fetchErr) throw fetchErr;

        // 2. Get the user's current pending balance
        const { data: profile, error: profileErr } = await supabase
            .from('user_profiles')
            .select('pendingdeposit')
            .eq('uuid', USERID)
            .single();
        if (profileErr) throw profileErr;

        // 3. Subtract the amount from pending
        let newPending = (Number(profile.pendingdeposit) || 0) - (Number(request.amount) || 0);
        if (newPending < 0) newPending = 0;

        // 4. Update profile and delete request
        await supabase.from('user_profiles').update({ pendingdeposit: newPending }).eq('uuid', USERID);
        await supabase.from('pendingDeposit').delete().eq('id', id);

        alert("Request deleted and pending balance adjusted.");
        loadDepositApprovalTable();
        if (typeof fetchUserData === 'function') fetchUserData();

    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        if (typeof window.hideSpinnerModal === 'function') window.hideSpinnerModal();
    }
};

// ==========================================
// 2. WITHDRAWAL APPROVAL (Table: withdraw)
// ==========================================
export async function loadWithdrawalApprovalTable() {
    const tableBody = document.getElementById("cvcx4");
    if (!tableBody || !USERID) return;
    tableBody.innerHTML = "";

    const { data, error } = await supabase
        .from('withdraw')
        .select('*')
        .eq('uuid', USERID)
        .order('created_at', { ascending: false });

    if (error) return;

    const currency = localStorage.getItem("currency") || "$";
    data.forEach(doc => {
        const row = `
            <tr>
                <td>#${doc.id}</td>
                <td>${doc.date}</td>
                <td>${doc.crypto_bank}</td>
                <td>${currency}${doc.amount}</td>
                <td>${doc.acct_name}</td>
                <td>${doc.address_account}</td>
                <td>${doc.swift}</td>
                <td><span class="badge ${doc.status === 'Pending' ? 'bg-warning' : 'bg-success'}">${doc.status}</span></td>
                <td><button class="btn btn-success btn-sm" onclick="handleApproveWithdraw('${doc.id}')">Approve</button></td>
                <td><button class="btn btn-danger btn-sm" onclick="handleDeleteWithdraw('${doc.id}')">Delete</button></td>
            </tr>`;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

window.handleApproveWithdraw = async (id) => {
    if (!confirm("Approve withdrawal and move to history?")) return;

    if (typeof window.showSpinnerModal === 'function') window.showSpinnerModal();

    try {
        // 1. Fetch the withdrawal request details
        const { data: request, error: fetchErr } = await supabase
            .from('withdraw')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchErr) throw fetchErr;

        // 2. Fetch current profile pendingwithdraw
        const { data: profile, error: profileErr } = await supabase
            .from('user_profiles')
            .select('pendingwithdraw')
            .eq('uuid', USERID)
            .single();
        if (profileErr) throw profileErr;

        const amountNum = Number(request.amount) || 0;

        // 3. Calculate new pending value (Subtract)
        let newPending = (Number(profile.pendingwithdraw) || 0) - amountNum;
        if (newPending < 0) newPending = 0; // Safety floor

        // 4. Update 'approvedWithdraw' history and update profile pending status
        await supabase.from('approvedWithdraw').insert([{ ...request, id: undefined, created_at: undefined, status: 'Completed' }]);

        await supabase.from('user_profiles')
            .update({ pendingwithdraw: newPending })
            .eq('uuid', USERID);

        // 5. Delete original request
        await supabase.from('withdraw').delete().eq('id', id);

        alert("Withdrawal Approved! Pending balance updated.");
        loadWithdrawalApprovalTable();
        if (typeof loadWithdrawHistory === 'function') loadWithdrawHistory(0);
        if (typeof fetchUserData === 'function') fetchUserData();

    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        if (typeof window.hideSpinnerModal === 'function') window.hideSpinnerModal();
    }
};

window.handleDeleteWithdraw = async (id) => {
    if (!confirm("Reject and delete this withdrawal? This will return the funds to the user's balance.")) return;

    if (typeof window.showSpinnerModal === 'function') window.showSpinnerModal();

    try {
        // 1. Get the request details
        const { data: request, error: fetchErr } = await supabase
            .from('withdraw')
            .select('amount')
            .eq('id', id)
            .single();
        if (fetchErr) throw fetchErr;

        // 2. Get the current user balances
        const { data: profile, error: profileErr } = await supabase
            .from('user_profiles')
            .select('account_balance, pendingwithdraw')
            .eq('uuid', USERID)
            .single();
        if (profileErr) throw profileErr;

        const amountNum = Number(request.amount) || 0;

        // 3. Logic: Add back to Balance, Subtract from Pending
        const newBalance = (Number(profile.account_balance) || 0) + amountNum;
        let newPending = (Number(profile.pendingwithdraw) || 0) - amountNum;
        if (newPending < 0) newPending = 0;

        // 4. Update profile and delete request
        await supabase.from('user_profiles')
            .update({
                account_balance: newBalance,
                pendingwithdraw: newPending
            })
            .eq('uuid', USERID);

        await supabase.from('withdraw').delete().eq('id', id);

        alert("Withdrawal rejected. Funds returned to user balance.");
        loadWithdrawalApprovalTable();
        if (typeof fetchUserData === 'function') fetchUserData();

    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        if (typeof window.hideSpinnerModal === 'function') window.hideSpinnerModal();
    }
};

// ==========================================
// 3. TRADING HISTORY (Table: trade_history)
// ==========================================
let tradePage = 0;
const tradeLimit = 10;

export async function loadTradeHistory(page = 0) {
    const tableBody = document.getElementById("cvcx");
    if (!tableBody || !USERID) return;
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

    const from = page * tradeLimit;
    const to = from + tradeLimit - 1;

    const { data, error, count } = await supabase
        .from('trade_history')
        .select('*', { count: 'exact' })
        .ilike('uuid', `%${USERID}%`)
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) return;

    if (data && data.length > 0) {
        tableBody.innerHTML = "";
        const currency = localStorage.getItem("currency") || "$";
        data.forEach(doc => {
            const row = `
                <tr>
                    <td>#${doc.id.substring(0, 8)}</td>
                    <td>${currency}${doc.amount}</td>
                    <td>${new Date(doc.created_at).toLocaleString()}</td>
                    <td>${doc.asset}</td>
                    <td><span class="badge bg-success">Completed</span></td>
                    <td><button class="btn btn-danger btn-sm" onclick="handleDeleteTrade('${doc.id}')">Delete</button></td>
                </tr>`;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
        updatePaginationUI("tradeNext", "tradePrev", page, count, tradeLimit);
    } else {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No trading history found.</td></tr>';
    }
}

window.changeTradePage = (dir) => { tradePage += dir; loadTradeHistory(tradePage); };
window.handleDeleteTrade = async (id) => {
    if (!confirm("Delete record?")) return;
    await supabase.from('trade_history').delete().eq('id', id);
    loadTradeHistory(tradePage);
};

// ==========================================
// 4. WITHDRAW HISTORY (Table: approvedWithdraw)
// ==========================================
let withdrawHistPage = 0;
const withdrawHistLimit = 10;

export async function loadWithdrawHistory(page = 0) {
    const tableBody = document.getElementById("cvcx5");
    if (!tableBody || !USERID) return;
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading...</td></tr>';

    const from = page * withdrawHistLimit;
    const to = from + withdrawHistLimit - 1;

    const { data, error, count } = await supabase
        .from('approvedWithdraw')
        .select('*', { count: 'exact' })
        .eq('uuid', USERID)
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) return;

    if (data && data.length > 0) {
        tableBody.innerHTML = "";
        const currency = localStorage.getItem("currency") || "$";
        data.forEach(doc => {
            const row = `
                <tr>
                    <td>#${doc.id}</td>
                    <td>${doc.date}</td>
                    <td>${doc.crypto_bank}</td>
                    <td>${currency}${doc.amount}</td>
                    <td>${doc.acct_name}</td>
                    <td>${doc.address_account}</td>
                    <td><span class="badge bg-success">${doc.status}</span></td>
                    <td><button class="btn btn-danger btn-sm" onclick="handleDeleteWithdrawHistory('${doc.id}')">Delete</button></td>
                </tr>`;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
        updatePaginationUI("withdrawHistNext", "withdrawHistPrev", page, count, withdrawHistLimit);
    } else {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No withdrawal history found.</td></tr>';
    }
}

window.changeWithdrawHistPage = (dir) => { withdrawHistPage += dir; loadWithdrawHistory(withdrawHistPage); };
window.handleDeleteWithdrawHistory = async (id) => {
    if (!confirm("Delete record?")) return;
    await supabase.from('approvedWithdraw').delete().eq('id', id);
    loadWithdrawHistory(withdrawHistPage);
};

// ==========================================
// 5. DEPOSIT HISTORY (Table: history)
// ==========================================
let depositHistPage = 0;
const depositHistLimit = 10;

export async function loadDepositHistory(page = 0) {
    const tableBody = document.getElementById("cvcx2");
    if (!tableBody || !USERID) return;
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';

    const from = page * depositHistLimit;
    const to = from + depositHistLimit - 1;

    const { data, error, count } = await supabase
        .from('history')
        .select('*', { count: 'exact' })
        .eq('uuid', USERID)
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) return;

    if (data && data.length > 0) {
        tableBody.innerHTML = "";
        const currency = localStorage.getItem("currency") || "$";
        data.forEach(doc => {
            const row = `
                <tr>
                    <td>#${doc.id}</td>
                    <td>${doc.date}</td>
                    <td>${currency}${doc.amount}</td>
                    <td>${doc.address}</td>
                    <td>${doc.cryptoCurrnecy}</td> 
                    <td><span class="badge bg-success">${doc.status}</span></td>
                    <td><button class="btn btn-danger btn-sm" onclick="handleDeleteDepositHistory('${doc.id}')">Delete</button></td>
                </tr>`;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
        updatePaginationUI("depHistNext", "depHistPrev", page, count, depositHistLimit);
    } else {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No records found.</td></tr>';
    }
}

window.changeDepHistPage = (dir) => { depositHistPage += dir; loadDepositHistory(depositHistPage); };
window.handleDeleteDepositHistory = async (id) => {
    if (!confirm("Delete record?")) return;
    await supabase.from('history').delete().eq('id', id);
    loadDepositHistory(depositHistPage);
};

// --- PAGINATION UI HELPER ---
function updatePaginationUI(nextId, prevId, currentPage, totalCount, limit) {
    const nextBtn = document.getElementById(nextId);
    const prevBtn = document.getElementById(prevId);
    if (prevBtn) prevBtn.disabled = currentPage === 0;
    if (nextBtn) nextBtn.disabled = (currentPage + 1) * limit >= totalCount;
}

// --- INITIALIZE ALL TABLES ---
loadDepositApprovalTable();
loadWithdrawalApprovalTable();
loadTradeHistory(0);
loadWithdrawHistory(0);
loadDepositHistory(0);