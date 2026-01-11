
window.showSpinnerModal = function () {
    const modal = document.getElementById('spinnerModal');
    if (modal) modal.style.display = 'flex';
}

window.hideSpinnerModal = function () {
    const modal = document.getElementById('spinnerModal');
    if (modal) modal.style.display = 'none';
}

// Now the rest of your app.js code...


const urlParams = new URLSearchParams(window.location.search);
const USERID = urlParams.get('i');

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);


//Personal Details

document.getElementById('setTrade').addEventListener('click', () => {
    location.href = `https://crypchain.onrender.com/admin/admin.html?user_id=${USERID}`;
});

// Helper to safely set UI elements only if they exist in the HTML
const syncUI = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
            el.value = value;
        } else {
            el.innerHTML = value;
        }
    }
};


function startRealtimeMonitor() {
    supabase
        .channel('admin_status_check')
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'admin', filter: 'id=eq.1' },
            (payload) => {
                // If the active status is changed to false in the DB, kick the admin immediately
                if (payload.new.active === false || payload.new.active === 'false') {
                    handleAccessDenied();
                }
            }
        )
        .subscribe();
}

startRealtimeMonitor();



function handleAccessDenied() {
    Swal.fire({
        title: 'Access Denied',
        text: 'Your session has been deactivated. Contact Developer.',
        icon: 'error',
        allowOutsideClick: false
    }).then(() => {
        window.location.href = "../../login/index.html";
    });
}


async function fetchUserData() {
    showSpinnerModal();
    let { data: doc, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('uuid', USERID)
        .single();

    if (error) {
        console.error('Error fetching:', error.message);
        hideSpinnerModal();
        return;
    }

    if (doc) {
        // Text/Header Data
        syncUI("weuss", `${doc.first_name} ${doc.last_name}`);
        syncUI("email", doc.email);
        document.getElementById("date").value = doc.dataof_birth;
        if (doc.created_at) {
            // Formats the timestamp into a readable date string (e.g., 1/7/2026)
            const dateCreated = new Date(doc.created_at).toLocaleDateString();
            document.getElementById("created_at").value = dateCreated;
        }
        // Form Inputs - Mapping Schema -> HTML ID
        syncUI("firstName", doc.first_name);
        syncUI("lastName", doc.last_name);
        syncUI("newEmail", doc.email);
        syncUI("password", doc.password);
        syncUI("phone", doc.phone_number);      // DB: phone_number -> HTML ID: phone
        syncUI("currency", doc.currency);
        syncUI("country", doc.country);
        syncUI("active", doc.active);
        syncUI("accountlevel", doc.account_level); // DB: account_level -> HTML ID: accountlevel
        syncUI("withdrawStatus", doc.withdrawStatus);
        syncUI("tradeStatus", doc.tradeStatus);

        // Financials (Mapping exactly to your numeric fields)
        syncUI("accountBalance", doc.account_balance);
        syncUI("totaldeposit", doc.totaldeposit);
        syncUI("totalwithdraw", doc.totalwithdraw);
        syncUI("pendingwithdraw", doc.pendingwithdraw);
        syncUI("pendingdeposit", doc.pendingdeposit);

        // Profile Image (The only allowed hardcoded fallback)
        const imgEl = document.getElementById("pmler");
        if (imgEl) {
            imgEl.src = doc.profile_picture || "../assets/images/user/avatar-1.jpg";
        }

        // Flag
        const flagEl = document.getElementById("flag");
        if (flagEl) flagEl.src = doc.countryFlag;

        hideSpinnerModal();
    }
}
// Call the new function
fetchUserData();


const formDAT1 = document.getElementById('fom1');
formDAT1.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData1 = new FormData(formDAT1);
    let firstName = formData1.get('firstName');
    let lastName = formData1.get('lastName');
    let phone = formData1.get('phone');
    let currency = formData1.get('currency');
    let date = formData1.get('date');
    let country = formData1.get('country');
    let tradeStatus = formData1.get('tradeStatus');
    let active = formData1.get('active');
    let withdrawStatus = formData1.get('withdrawStatus');
    let accountlevel = formData1.get('accountlevel');
    showSpinnerModal();


    try {
        const response = await fetch(`https://restcountries.com/v3.1/name/${country}`);
        if (!response.ok) throw new Error("Country not found");

        const data = await response.json();
        const flagUrl = data[0].flags.svg;


        async function updateData() {
            const { data, error } = await supabase
                .from('user_profiles')
                .update({
                    first_name: firstName,
                    last_name: lastName,
                    phone_number: phone,      // Fixed: matches new schema
                    currency: currency,
                    dataof_birth: date,       // Fixed: matches new schema
                    country: country,
                    countryFlag: flagUrl,     // Matches new schema
                    "tradeStatus": tradeStatus,
                    active: active,
                    "withdrawStatus": withdrawStatus,
                    account_level: accountlevel // Fixed: matches new schema
                })
                .eq('uuid', USERID);

            if (error) {
                hideSpinnerModal();
                Swal.fire('Error', error.message, 'error');
            } else {
                hideSpinnerModal();
                Swal.fire('Success', 'Profile updated successfully', 'success');
            }
        }
        updateData();

    } catch (error) {
        hideSpinnerModal()
        alert('country not found')
    }

    //update data


})

const imageUpload = document.getElementById('imageUpload');
imageUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    showSpinnerModal();
    if (!file) {
        alert("Please select an image file");
        return;
    }
    try {
        const fileExt = file.name.split('.').pop();
        const filePath = `${Date.now()}.${fileExt}`;

        const { data, error } = await supabase
            .storage
            .from('profileimages') // Replace with your bucket name
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
            });
        if (error) {
            throw error;
        }
        hideSpinnerModal()
        alert(`Successfully uploaded image to ${data.path}`);
        imm(data.path);

    } catch (error) {
        hideSpinnerModal()
        alert(`Error uploading image! ${error.message}`);
    }

});

function imm(params) {
    const { data, error } = supabase
        .storage
        .from('profileimages')
        .getPublicUrl(params);

    if (error) {
        console.error('Error getting public URL:', error);
    } else {
        const publicUrl = data.publicUrl;

        //adding image to database
        async function updateData() {
            const { data, error } = await supabase
                .from('user_profiles')
                .update({
                    profile_picture: publicUrl
                })
                .eq('uuid', USERID);
            if (error) {
                console.error('Error updating data:', error);
            } else {
                console.log('Data updated:', data);
                //page reload after uploading image
                location.reload();
            }
        }
        updateData();
    }
}



/////Account Balance



const formDA = document.getElementById('fom4');
formDA.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData1 = new FormData(formDA);

    // Clean currency formatting and commas
    let accountBalance = formData1.get('accountBalance').replace(/[^0-9.-]+/g, "");
    let totaldeposit = formData1.get('totaldeposit').replace(/[^0-9.-]+/g, "");
    let totalwithdraw = formData1.get('totalwithdraw').replace(/[^0-9.-]+/g, "");
    let pendingdeposit = formData1.get('pendingdeposit').replace(/[^0-9.-]+/g, "");
    let pendingwithdraw = formData1.get('pendingwithdraw').replace(/[^0-9.-]+/g, "");

    showSpinnerModal();

    async function updateFinancials() {
        const { data, error } = await supabase
            .from('user_profiles')
            .update({
                // LEFT SIDE: Database Column Name | RIGHT SIDE: Your variable
                account_balance: Number(accountBalance), // Corrected to underscore
                totaldeposit: Number(totaldeposit),
                totalwithdraw: Number(totalwithdraw),
                pendingwithdraw: Number(pendingwithdraw),
                pendingdeposit: Number(pendingdeposit),
            })
            .eq('uuid', USERID);

        if (error) {
            hideSpinnerModal();
            console.error('Error updating data:', error.message);
            Swal.fire('Update Failed', error.message, 'error');
        } else {
            hideSpinnerModal();
            Swal.fire('Success', 'Financial records updated', 'success');
            // Make sure you renamed your fetch function to fetchUserData as we discussed
            fetchUserData();
        }
    }
    updateFinancials();
});



////DIRECT DEPOSIT

const formDA6700 = document.getElementById('fom6');
formDA6700.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData1 = new FormData(formDA6700);

    // 1. Clean the input (remove commas/symbols)
    let depositAmount = Number(formData1.get('depositAmount').replace(/[^0-9.-]+/g, ""));
    let depositWalletAddrss = formData1.get('depositWalletAddrss');
    let depositCryptoCurrnecy = formData1.get('depositCryptoCurrnecy');
    let depositDate = formData1.get('depositDate');

    showSpinnerModal();

    try {
        // 2. STEP ONE: Get the LATEST balance from the DB (Not LocalStorage)
        const { data: currentProfile, error: fetchError } = await supabase
            .from('user_profiles')
            .select('account_balance, totaldeposit')
            .eq('uuid', USERID)
            .single();

        if (fetchError) throw fetchError;

        // Convert current values to numbers to ensure safe math
        const dbBalance = Number(currentProfile.account_balance) || 0;
        const dbTotalDeposit = Number(currentProfile.totaldeposit) || 0;

        // 3. STEP TWO: Perform the addition
        const newBalance = dbBalance + depositAmount;
        const newTotalDeposit = dbTotalDeposit + depositAmount;

        // 4. STEP THREE: Update user_profiles with the new summed values
        const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
                account_balance: newBalance,
                totaldeposit: newTotalDeposit
            })
            .eq('uuid', USERID);

        if (updateError) throw updateError;

        // 5. STEP FOUR: Add to History table
        const { error: histError } = await supabase
            .from('history')
            .insert({
                amount: depositAmount,
                address: depositWalletAddrss,
                date: depositDate,
                cryptoCurrnecy: depositCryptoCurrnecy,
                status: 'Complete',
                uuid: USERID
            });

        if (histError) throw histError;

        // SUCCESS
        hideSpinnerModal();
        Swal.fire('Success', `Added ${depositAmount} to balance.`, 'success');

        // Refresh the UI to show the new balance immediately
        fetchUserData();

    } catch (err) {
        hideSpinnerModal();
        console.error('Transaction Failed:', err.message);
        Swal.fire('Error', 'Transaction failed: ' + err.message, 'error');
    }
});


document.getElementById('deleteUser').addEventListener('click', () => {
    async function deleteUser(parent) {
        const { data, error } = await supabase
            .from('approvedWithdraw')
            .delete()
            .eq('uuid', USERID);
        if (error) {
            console.error('Error deleting data:', error);
        } else {
            const { data, error } = await supabase
                .from('user_profiles')
                .delete()
                .eq('uuid', USERID);
            if (error) {
                console.error('Error deleting data:', error);
            } else {
                const { data, error } = await supabase
                    .from('email')
                    .delete()
                    .eq('uuid', USERID);
                if (error) {
                    console.error('Error deleting data:', error);
                } else {
                    const { data, error } = await supabase
                        .from('history')
                        .delete()
                        .eq('uuid', USERID);
                    if (error) {
                        console.error('Error deleting data:', error);
                    } else {
                        const { data, error } = await supabase
                            .from('notifications')
                            .delete()
                            .eq('uuid', USERID);
                        if (error) {
                            console.error('Error deleting data:', error);
                        } else {
                            const { data, error } = await supabase
                                .from('pendingDeposit')
                                .delete()
                                .eq('uuid', USERID);
                            if (error) {
                                console.error('Error deleting data:', error);
                            } else {
                                const { data, error } = await supabase
                                    .from('trade')
                                    .delete()
                                    .eq('uuid', USERID);
                                if (error) {
                                    console.error('Error deleting data:', error);
                                } else {
                                    const { data, error } = await supabase
                                        .from('withdraw')
                                        .delete()
                                        .eq('uuid', USERID);
                                    if (error) {
                                        console.error('Error deleting data:', error);
                                    } else {
                                        //AUTH DELETE


                                        const supabase2 = createClient(CONFIG.SUPABASE_URL, CONFIG.ADMIN_KEY);
                                        const { error } = await supabase2.auth.admin.deleteUser(USERID)
                                        if (error) console.error("Error deleting user", error)
                                        else window.location.href = "../../users/dashboard/users.html";
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    deleteUser();
})

async function signOutUser() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        console.log('Error signing out:', error.message);
    } else {
        console.log('User signed out successfully');
        window.location.href = "../../login/index.html";
    }
}


document.getElementById('out').addEventListener('click', () => {
    signOutUser();
});