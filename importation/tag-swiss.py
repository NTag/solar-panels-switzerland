from __future__ import print_function
from keras.applications.resnet50 import ResNet50, preprocess_input
from keras.preprocessing.image import ImageDataGenerator, load_img, img_to_array
from keras.models import Model
import numpy as np

import os
import os.path as op
import shutil
from zipfile import ZipFile
from time import time

from keras.models import Sequential
from keras.layers import Dense, Dropout
from keras.optimizers import Adam

full_imagenet_model = ResNet50(weights='imagenet')

output = full_imagenet_model.layers[-2].output
base_model = Model(full_imagenet_model.input, output)

def preprocess_function(x):
    if x.ndim == 3:
        x = x[np.newaxis, :, :, :]
    return preprocess_input(x)

batch_size = 20

def list_imgs(canton):
    folder = op.join('croped', canton)
    already = []
    try:
        with open(op.join('classed', canton) + '.txt', 'r') as iclassed:
            lines = iclassed.readlines()
            for l in lines:
                already.append(l.split(':')[0])
    except IOError:
        print('New file')
    images = [f for f in os.listdir(folder) if (op.isfile(op.join(folder, f)) and f not in already)]
    total = len(images)
    for i in range(total // batch_size):
        imagesl = images[i*batch_size:(i+1)*batch_size]
        limgs = []
        lnames = []
        for im in imagesl:
            img = load_img(op.join(folder, im), target_size=(224, 224))
            y = img_to_array(img)
            y = np.expand_dims(y, axis=0)
            limgs.append(y)
            lnames.append(im)
        yield [lnames, np.vstack(limgs)]

print("Loading precomputed features")
labels_train = np.load('labels_train.last.npy')
features_train = np.load('features_train.last.npy')

print(np.mean(labels_train))

n_samples, n_features = features_train.shape
print(n_features, "features extracted")

top_model = Sequential()
top_model.add(Dense(1, input_dim=n_features, activation='sigmoid'))
top_model.compile(optimizer=Adam(lr=1e-4),
                  loss='binary_crossentropy', metrics=['accuracy'])

top_model.fit(features_train, labels_train,
              validation_split=0.1, verbose=2, nb_epoch=50)

model = Model(base_model.input, top_model(base_model.output))

# valgen = ImageDataGenerator(preprocessing_function=preprocess_function)
# val_flow = valgen.flow_from_directory(validation_folder, batch_size=batch_size,
#                                target_size=(224, 224), shuffle=False,
#                                class_mode='binary')

fold = 'croped'
cantons = [f for f in os.listdir(fold) if op.isdir(op.join(fold, f))]
for canton in cantons:
    j = 0
    imgs = list_imgs(canton)
    for img in imgs:
        j += 1
        names = img[0]
        ims = img[1]
        classes = model.predict(ims, batch_size=batch_size)
        print(canton + ' ' + str(j))
        with open(op.join('classed', canton) + '.txt', "a") as vfile:
            for i in range(len(names)):
                vfile.write(names[i] + ":" + str(classes[i][0]) + "\n")
#
# all_correct = []
# for i, (X, y) in zip(range(179 // batch_size), val_flow):
#     print(X)
#     predictions = model.predict(X).ravel()
#     correct = list((predictions > 0.5) == y)
#     all_correct.extend(correct)
#     print("Processed %d images" % len(all_correct))
#
# print("Validation accuracy: %0.4f" % np.mean(all_correct))
