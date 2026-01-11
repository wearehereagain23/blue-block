// Q1V1y9tyu0NI.js

document.addEventListener("DOMContentLoaded", function () {
    // --- 1. Password Visibility Toggle ---
    const passGroups = document.querySelectorAll(".auth-pass-inputgroup");

    passGroups.forEach(function (group) {
        const addon = group.querySelector(".password-addon");
        const input = group.querySelector(".password-input");

        if (addon && input) {
            addon.addEventListener("click", function () {
                input.type = (input.type === "password") ? "text" : "password";
            });
        }
    });

    // --- 2. Real-Time Password Match Validation ---
    const password = document.getElementById("password-input");
    const confirm_password = document.getElementById("confirm-password-input");

    function validatePassword() {
        if (!password || !confirm_password) return;

        // Using setCustomValidity('') clears the error and allows the form to submit
        if (password.value !== confirm_password.value) {
            confirm_password.setCustomValidity("Passwords Don't Match");
        } else {
            confirm_password.setCustomValidity("");
        }
    }

    // Trigger validation on every keystroke for both fields
    if (password && confirm_password) {
        password.addEventListener("input", validatePassword);
        confirm_password.addEventListener("input", validatePassword);
    }

    // --- 3. Password Strength Indicators ---
    const myInput = document.getElementById("password-input");
    const letter = document.getElementById("pass-lower");
    const capital = document.getElementById("pass-upper");
    const number = document.getElementById("pass-number");
    const length = document.getElementById("pass-length");
    const containBox = document.getElementById("password-contain");

    if (myInput) {
        myInput.onfocus = () => { if (containBox) containBox.style.display = "block"; };
        myInput.onblur = () => { if (containBox) containBox.style.display = "none"; };

        myInput.onkeyup = function () {
            // Validate lowercase
            if (myInput.value.match(/[a-z]/g)) {
                letter.classList.replace("invalid", "valid");
            } else {
                letter.classList.replace("valid", "invalid");
            }

            // Validate uppercase
            if (myInput.value.match(/[A-Z]/g)) {
                capital.classList.replace("invalid", "valid");
            } else {
                capital.classList.replace("valid", "invalid");
            }

            // Validate numbers
            if (myInput.value.match(/[0-9]/g)) {
                number.classList.replace("invalid", "valid");
            } else {
                number.classList.replace("valid", "invalid");
            }

            // Validate length
            if (myInput.value.length >= 8) {
                length.classList.replace("invalid", "valid");
            } else {
                length.classList.replace("valid", "invalid");
            }
        };
    }
});