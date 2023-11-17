/*
    MIT License

    Copyright (c) 2023 Niall McCarroll

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/

function test() {

    const picker = create_date_range_pickers('start_date_year', 'start_date_month', 'start_month_controls', 'start_date_day', 'start_day_controls',
        'end_date_year', 'end_date_month', 'end_month_controls', 'end_date_day', 'end_day_controls');

    var change_time_step = document.getElementById("change_time_step");
    change_time_step.addEventListener("change", function (evt) {
        let value = change_time_step.value;
        try {
            picker.change_timestep(value);
        } catch (ex) {
            alert(ex);
            change_time_step.value = picker.time_step;
        }
    });

    var period_start_date = document.getElementById("period_start_date");
    var period_end_date = document.getElementById("period_end_date");
    let range_callback = (evt) => {
        let period_start_dt = new Date(period_start_date.value + 'T00:00:00.000Z');
        let period_end_dt = new Date(period_end_date.value + 'T00:00:00.000Z');
        let time_step = change_time_step.value;
        picker.configure(period_start_dt.getFullYear(), period_start_dt.getMonth() + 1, period_start_dt.getDate(),
            period_end_dt.getFullYear(), period_end_dt.getMonth() + 1, period_end_dt.getDate(), time_step);
        change_time_step.value = picker.time_step;
    }
    period_start_date.addEventListener("change", range_callback);
    period_end_date.addEventListener("change", range_callback);

    picker.define_callback((start, end) => {
        const start_str = start ? start.toUTCString() : "undefined";
        const end_str = end ? end.toUTCString() : "undefined";
        document.getElementById("test_period").innerText = start_str + " => " + end_str;
    });


    picker.configure(2010, 1, 1, 2020, 12, 31, change_time_step.value);
}