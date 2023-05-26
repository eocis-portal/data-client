# -*- coding: utf-8 -*-

#    EOCIS data-client

#    Copyright (C) 2020-2023  National Centre for Earth Observation (NCEO)
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as published by
#    the Free Software Foundation, either version 3 of the License, or
#    (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <https://www.gnu.org/licenses/>.

import os.path
import sys
import logging

from flask import Flask, render_template, request, send_from_directory, abort, jsonify

from eocis_data_manager.store import Store
from eocis_data_manager.schema_operations import SchemaOperations
from eocis_data_manager.job_manager import JobManager
from eocis_data_manager.job_operations import JobOperations
from eocis_data_manager.job import Job

import os

# flask initialisation and configuration (see config.py)

rootdir = os.path.abspath(os.path.join(os.path.split(__file__)[0],"..",".."))
print(rootdir)

app = Flask(__name__,template_folder=os.path.join(rootdir,"templates"))

app.config.from_object('eocis_data_manager.config.Config')

output_folder = os.path.join(app.config["OUTPUT_PATH"],"data")

# open the database containing the list of active jobs
store = Store(app.config["DATABASE_PATH"])
with SchemaOperations(store) as t:
    # load the schema into the database
    t.populate_schema("/home/dev/github/data-manager/test/schema")



start_year = app.config["START_YEAR"]
start_month = app.config["START_MONTH"]
end_year = app.config["END_YEAR"]
end_month = app.config["END_MONTH"]

default_start_year = app.config["DEFAULT_START_YEAR"]
default_start_month = app.config["DEFAULT_START_MONTH"]
default_end_year = app.config["DEFAULT_END_YEAR"]
default_end_month = app.config["DEFAULT_END_MONTH"]


task_quota = app.config["TASK_QUOTA"]
job_quota = app.config["JOB_QUOTA"]


GENERIC_ERROR = "An internal error occurred and it was not possible to complete your request."

class App:
    """
    Define the routes and handlers for the web service
    """

    logger = logging.getLogger("app")

    def __init__(self):
        pass


    ####################################################################################################################
    # Main end points, invoked from the app.html webapp
    #

    @staticmethod
    @app.route('/submit.json',methods = ['POST'])
    def submit():
        """Handle submitted form.  Perform server side validation and add a new job into the database."""
        try:
            with JobOperations(store) as t:
                job = Job.create(request.json)
                t.createJob(job)
                job_id = job.getJobId()

            jm = JobManager(store)
            jm.create_tasks(job_id)

            msg = "Thank you.  Your job was successfully submitted and has been assigned the JOB-ID: %s. " % (job_id)
            return jsonify({"job_id":job_id,"message":msg})
        except:
            App.logger.exception("submit")
            return jsonify({"message": GENERIC_ERROR})


    @staticmethod
    @app.route('/view.json', methods=['POST'])
    def view():
        """Handle request for list of running jobs per user."""
        try:
            content = request.json
            submitter_id = content['submitter_id']
            job_list = []

            with JobOperations(store) as t:
                running_job_count = t.countJobsByState([Job.STATE_RUNNING])
                jobs = t.listJobsBySubmitterId(submitter_id)
                for job in jobs:
                    job_detail = job.serialise(t)
                    # if job.getState() == Job.STATE_COMPLETED:
                    #    job_detail["download_links"] = \
                    #        [[label,url] for (label,url) in monitor.collectDownloadLinks(job.getJobId())]
                    job_list.append(job_detail)

            return jsonify({"jobs": job_list, "running_jobs": running_job_count})
        except:
            App.logger.exception("view")
            return jsonify({"jobs": [], "running_jobs": "?"})

    ####################################################################################################################
    # Service static files
    #

    @staticmethod
    @app.route('/metadata/bundles', methods=['GET'])
    def get_bundles():
        t = SchemaOperations(store)
        bundles = []
        for b in t.listBundles():
            bundles.append({"id": b.bundle_id, "name": b.bundle_name})
        return jsonify(bundles)

    @staticmethod
    @app.route('/metadata/bundles/<bundle>/variables', methods=['GET'])
    def get_variables(bundle=None):
        t = SchemaOperations(store)
        variables = []
        for ds in t.listDataSets():
            for variable in ds.variables:
                variable_id = ds.dataset_id + ":" + variable.variable_id
                variables.append({"id":variable_id,"variable_name":variable.variable_name,"dataset_name":ds.dataset_name})
        return jsonify(variables)

    ####################################################################################################################
    # Service static files
    #

    @staticmethod
    @app.route('/', methods=['GET'])
    @app.route('/index.html', methods=['GET'])
    def fetch():
        """Serve the main page containing the regridding form"""
        return render_template('app.html', title="EOCIS Data", subtitle="Service",
                               service_name="EOCIS data service",
                               start_year=start_year, start_month=start_month, end_year=end_year, end_month=end_month,
                               default_start_year=default_start_year, default_start_month=default_start_month,
                               default_end_year=default_end_year, default_end_month=default_end_month,
                               output_formats="The dataset will be prepared in netcdf4 format at the temporal and spatial resolution specified in the request form below.",
                               summary="Obtain L4 sea and ocean surface temperature datasets in your chosen spatial and temporal resolution.")




    @staticmethod
    @app.route('/css/<path:path>',methods = ['GET'])
    def send_css(path):
        """serve CSS files"""
        return send_from_directory(os.path.join(rootdir,'static','css'), path)

    @staticmethod
    @app.route('/js/<path:path>', methods=['GET'])
    def send_js(path):
        """serve JS files"""
        return send_from_directory(os.path.join(rootdir,'static','js'), path)

    @staticmethod
    @app.route('/images/<path:path>', methods=['GET'])
    def send_images(path):
        """serve image files"""
        return send_from_directory(os.path.join(rootdir,'static','images'), path)

    @staticmethod
    @app.route('/favicon.ico', methods=['GET'])
    def send_favicon():
        """serve favicon"""
        return send_from_directory(os.path.join(rootdir,'static','images'), 'favicon.ico')

    @staticmethod
    @app.route('/data/<path:path>', methods=['GET'])
    def send_data(path):
        """serve data files"""
        if os.path.exists(os.path.join(output_folder,path)):
            return send_from_directory(output_folder, path)
        else:
            abort(404)

    @app.errorhandler(404)
    def page_not_found(error):
        return render_template('404.html', title='404'), 404

    @app.after_request
    def add_header(r):
        r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        r.headers["Pragma"] = "no-cache"
        r.headers["Expires"] = "0"
        return r


if __name__ == '__main__':
    try:
        app.run(host=app.config["HOST"],port=app.config["PORT"])
    except:
        App.logger.exception("web service")
        sys.exit(-1)



