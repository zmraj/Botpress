import logging
import os

import tensorflow as tf
import transformers
# from pick import pick
from rich import print

# import shutil

logging.disable(logging.WARNING)
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

model_modules = {
    "distilbert": {
        "tokenizer_name": "DistilBertTokenizer",
        "bertizer_name": "DistilBertModel",
        "config_name": "DistilBertConfig"
    },
    "camembert": {
        "tokenizer_name": "CamembertTokenizer",
        "bertizer_name": "CamembertModel",
        "config_name": "CamembertConfig"
    },
    "roberta": {
        "tokenizer_name": "RobertaTokenizer",
        "bertizer_name": "RobertaModel",
        "config_name": "RobertaConfig"
    },
    "albert": {
        "tokenizer_name": "AlbertTokenizer",
        "bertizer_name": "AlbertModel",
        "config_name": "AlbertConfig"
    },
    "xlm-roberta": {
        "tokenizer_name": "XLMRobertaTokenizer",
        "bertizer_name": "XLMRobertaModel",
        "config_name": "XLMRobertaConfig"
    },
    "electra": {
        "tokenizer_name": "ElectraTokenizer",
        "bertizer_name": "ElectraModel",
        "config_name": "ElectraConfig"
    },
    "gpt": {
        "tokenizer_name": "GPT2Tokenizer",
        "bertizer_name": "GPT2Model",
        "config_name": "GPT2Config"
    },
    "xlnet": {
        "tokenizer_name": "XLNetTokenizer",
        "bertizer_name": "XLNetModel",
        "config_name": "XLNetConfig"
    },
    "t5": {
        "tokenizer_name": "T5Tokenizer",
        "bertizer_name": "T5Model",
        "config_name": "T5Config"
    },
    "xlm": {
        "tokenizer_name": "XLMTokenizer",
        "bertizer_name": "XLMModel",
        "config_name": "XLMConfig"
    },
    "bert": {
        "tokenizer_name": "BertTokenizer",
        "bertizer_name": "BertModel",
        "config_name": "BertConfig"
    }
}


def save_tensorflow_model(model_name: str, model_path):
    print(f"Got name : [cyan1] {model_name} [/cyan1] :rocket:")
    print("All other models are available at : ")
    print("https://huggingface.co/models")
    print("https://huggingface.co/transformers/pretrained_models.html\n\n")

    if "xlm-roberta" in model_name:
        type_name = "xlm-roberta"
    else:
        type_name = model_name.lower().split("/")[-1].split("-")[0]
    tokenizer_name = model_modules[type_name]["tokenizer_name"]
    bertizer_name = model_modules[type_name]["bertizer_name"]
    config_name = model_modules[type_name]["config_name"]

    if not bertizer_name or not tokenizer_name:
        raise AssertionError(
            f"Cannot find model or tokenizer named {model_name}")

    # Load the good submodule (e.g BertModel, DistilBertModel etc...)
    print(
        f":crystal_ball: Getting tokenizer, model and config for {type_name}")
    tokenizer_module = getattr(transformers, tokenizer_name)
    bertizer_module = getattr(transformers, bertizer_name)
    config_module = getattr(transformers, config_name)
    TFbertizer_module = getattr(transformers, "TF" + bertizer_name)

    tokenizer = tokenizer_module.from_pretrained(model_name)
    bertizer = bertizer_module.from_pretrained(model_name)

    # Save pytorch model in deepnodecache and remove the pytorch cache
    print(":floppy_disk: Saving [green1]pytorch[/green1] tokenizer and model")
    tokenizer.save_pretrained(model_path)
    bertizer.save_pretrained(model_path)

    # Load the model in tensorflow
    print(""":inbox_tray: Loading [orange_red1]Tensorflow[/orange_red1] model
        from [green1]pytorch[/green1] saved one""")
    config = config_module.from_json_file(model_path + "/config.json")
    TFmodel = TFbertizer_module.from_pretrained(model_path,
                                                from_pt=True,
                                                config=config)

    concrete_function = tf.function(TFmodel.call).get_concrete_function([
        tf.TensorSpec([None, None], tf.int32, name="input_ids"),
        tf.TensorSpec([None, None], tf.int32, name="attention_mask")
    ])
    print(":floppy_disk: Saving [orange_red1]Tensorflow[/orange_red1] model")
    tf.saved_model.save(TFmodel, model_path, signatures=concrete_function)
    print(f""":heart_eyes: Done saving [cyan1]{model_name}[/cyan1]
        in {model_path} :+1:""")


# def clean_models(model_type):
#     deepnode_cache = os.path.expanduser(
#         os.path.join(os.getenv('XDG_CACHE_HOME', "~/.cache"), "deepnode"))
#     deepnode_cache_tf = os.path.join(deepnode_cache, "tensorflow")
#     deepnode_cache_pt = os.path.join(deepnode_cache, "pytorch")
#     choices = []
#     if model_type == "torch":
#         choices = os.listdir(deepnode_cache_pt)
#     if model_type == "tensorflow":
#         choices = os.listdir(deepnode_cache_tf)
#     if model_type == "all":
#         input(
#             "Select from tensorflow folder,
# it will try to delete in the pytorch folder"
#         )
#         choices = os.listdir(deepnode_cache_tf)
#     selected = pick(choices,
#                     'Please choose models to delete :',
#                     multiselect=True,
#                     min_selection_count=1)
#     for folder, _ in selected:
#         if model_type == "tensorflow" or model_type == "all":
#             shutil.rmtree(os.path.join(deepnode_cache_tf, folder),
#                           ignore_errors=True)
#         if model_type == "pytorch" or model_type == "all":
#             shutil.rmtree(os.path.join(deepnode_cache_pt, folder),
#                           ignore_errors=True)

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description='Save Tensorflow models for NodeJs')
    parser.add_argument('-m',
                        '--model',
                        dest="model_name",
                        action="store",
                        help='The hugging face model name')
    parser.add_argument('--cache',
                        dest="model_path",
                        action="store",
                        help='The path where the model will be stored')
    # parser.add_argument(
    #     '-c',
    #     '--clean',
    #     # nargs="?",
    #     # const=None,
    #     dest="clean",
    #     action="store",
    #     choices=["torch", "tensorflow", "all"],
    #     help='Interactive cleaning models')
    args = parser.parse_args()
    # if args.clean:
    #     clean_models(args.clean)
    # if not args.clean:
    #     save_tensorflow_model(args.model_name, args.model_path)
    save_tensorflow_model(args.model_name, args.model_path)
