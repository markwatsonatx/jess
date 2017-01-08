#!/bin/bash
absPath() {
    if [[ -d "$1" ]]; then
        cd "$1"
        echo "$(pwd -P)"
    else 
        cd "$(dirname "$1")"
        echo "$(pwd -P)/$(basename "$1")"
    fi
}
./wsk_set_env_prod.sh
func_name=$1
func_file_name=$2
func=$(wsk action get $func_name 2> /dev/null)
action='create'
if [ -n "$func" ]
    then
        action='update'
fi
wsk_cmd=$(echo 'wsk action '$action' --kind nodejs:6')
mkdir -p ./release/prod
func_rel_file_name=$(echo $func_file_name | sed 's/.*\///')
func_rel_file_name=$(echo $func_rel_file_name | sed 's/\.[^.]*$//')
func_tmp_file_name=$(echo $(dirname $(absPath ${BASH_SOURCE[0]}))'/release/prod/__'$func_rel_file_name'__.js')
pushd $(dirname $(absPath $func_file_name))
j2 $func_file_name > $func_tmp_file_name
popd
while read -r line; do
	param_name=$(echo $line | sed 's/^.*\:[ ]*\(.*\)$/\1/')
	if [ -n "$param_name" ]
	then
		param_value=$(cat ../params/default_params_prod.txt | sed -n 's/^'$param_name'[^=]*=[ ]*\(.*\)$/\1/p')
		param_value=$(echo $param_value | sed "s/\'/\"/g")
		wsk_cmd=$(echo $wsk_cmd" --param "$param_name "'"$param_value"'")
	fi
done <<< "$(grep -E '\$DefaultParam\:[ ]*.*' $func_tmp_file_name)"
wsk_cmd=$(echo $wsk_cmd $func_name $func_tmp_file_name)
echo $wsk_cmd
eval $wsk_cmd