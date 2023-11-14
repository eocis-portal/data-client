# date-range-picker

A very simple vanilla select-control based date range picker for defining date ranges based on specific time steps

## Usage

Include HTML in your page that defines:

* 3 selects for the start day, month and year respectively
* 2 spans or divs that contain the start day and start month selects and any associated labels respectively
* 3 selects for the end day, month and year respectively
* 2 spans or divs that contain the end day and end month selects and any associated labels respectively

```html
<table>
    <tr>
        <td>
            <label class="mainlabel" for="start_date_year" id="start_date_label">Start Date</label>
        </td>
        <td colspan="2">
            <label class="mainlabel" for="start_date_year" id="start_date_year_label">Year</label>
            <select id="start_date_year" name="start_date_year">
            </select>

            <span id="start_month_controls"><label class="mainlabel" for="start_date_month"
                                                   id="start_date_month_label"
                                                   style="margin-left:20px;">Month</label>
                    <select id="start_date_month" name="start_date_year">
            </select>
            </span>

            <span id="start_day_controls"><label class="mainlabel" for="start_date_day"
                                                 id="start_date_day_label" style="margin-left:20px;">Day</label>
            <select id="start_date_day" name="start_date_year">
            </select>
            </span>
        </td>
    </tr>
    <tr>
        <td>
            <label class="mainlabel tooltip" for="end_date_year" id="end_date_label">End Date</label>
        </td>
        <td colspan="2">
            <label class="mainlabel" for="end_date_year" id="end_date_year_label">Year</label>
            <select id="end_date_year" name="end_date_year">
            </select>

            <span id="end_month_controls">
                <label class="mainlabel" for="end_date_month"
                                                 id="end_date_month_label"
                                                 style="margin-left:20px;">Month</label>
                <select id="end_date_month" name="end_date_year">
                </select>
            </span>

            <span id="end_day_controls">
                <label class="mainlabel" for="end_date_day"
                                               id="end_date_day_label" style="margin-left:20px;">Day</label>
                <select id="end_date_day" name="end_date_year">
                </select>
            </span>
        </td>
    </tr>
</table>
```

Also, include the `date-range-picker.js` script in your page

```html
<script src="date-range-picker.js"></script>
```

Once the page has loaded, create the picker using JS code, passing in the ids of the HTML elements defined in your page

```javascript
const picker = create_date_range_pickers('start_date_year', 'start_date_month', 'start_month_controls', 'start_date_day', 'start_day_controls',
        'end_date_year', 'end_date_month', 'end_month_controls', 'end_date_day', 'end_day_controls');

```

Register a callback to be notified when the date range is initialised or changed

```javascript
picker.define_callback((start,end) => {
        // start and end are javascript Date objects describing the range or undefined (if the selected range is not valid)
    });
```

Set up the minimum and maximum date, passing in the year, month and day for each. 

```javascript
picker.configure(2010, 1, 1, 2020, 12, 31);
```

* Note: the `configure` method will throw an exception if the minimum date is greater than the maximum date

By default, the time step is set to "daily".  To change this call:

```javascript
picker.change_timestep("monthly");
```

The following time steps are supported:

| step      | characteristics of output date range                                           |
|-----------|--------------------------------------------------------------------------------|
| annual    | date range covers one or more calendar years                                   |
| seasonal  | date range covers one or more seasons, as defined by months DJF, MAM, JJA, SON |
| monthly   | date range covers one or more calendar months                                  |
| 10-day    | date range covers one or more dekads (month aligned ~10 day periods)           |
| 5-day     | date range covers one or more pentads (month aligned ~5 day periods)           |
| daily     | date range covers any sequence of dates                                        |

* Note: the `change_timestep` method will throw an exception if there are no complete time steps within the configured min/max dates, and the original time step will be retained
