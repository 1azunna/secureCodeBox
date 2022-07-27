import os
import logging
import subprocess
from pathlib import Path

def run_postman_collection(self, proxy_config: dict, collection: str, environment: str=None, extra_args: list=[]):
    """ Run postman collections through zap using newman cli. See https://github.com/postmanlabs/newman """
    
    if not Path(collection).is_file() and not (collection.startswith('https://') or collection.startswith('http://')):
        raise FileNotFoundError("Postman collection file doesn't exist or url is invalid.")
    default_args = ['--insecure']
    base_command = f'newman run {collection} '
    if environment is not None:
        if not Path(environment).is_file() and not (environment.startswith('https://') or environment.startswith('http://')):
            raise FileNotFoundError("Postman environment file doesn't exist or url is invalid.")
        base_command+= f'-e {environment} '
    if len(extra_args) > 0:
        all_args = list(set(default_args + extra_args))
        base_command+= ' '.join(all_args)
    else:
        base_command+= ' '.join(default_args)
    # logging.debug(base_command.split(' ')) #This will display any api keys in the logs.
    #Set proxy settings for newman 
    os.environ['http_proxy'] = proxy_config['http']
    os.environ['https_proxy'] = proxy_config['https']
    command = subprocess.Popen(base_command.split(' '), stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    output, error = command.communicate()
    if error:
        logging.error('Error occured while running newman command. Is newman cli installed?.')
    elif command.returncode != 0:
        logging.warning('An Error occured while running collection. See output: \n%s',output.decode('utf-8'))
    else:
        logging.info('Postman collection ran successfully. \n%s',output.decode('utf-8'))
    #unset proxy
    del os.environ['http_proxy']
    del os.environ['https_proxy']
