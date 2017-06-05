from __future__ import print_function
from keras.applications.resnet50 import ResNet50, preprocess_input
from keras.preprocessing.image import ImageDataGenerator
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

data_folder = op.expanduser('images')
train_folder = op.join(data_folder, 'train')
validation_folder = op.join(data_folder, 'validation')

full_imagenet_model = ResNet50(weights='imagenet')

output = full_imagenet_model.layers[-2].output
base_model = Model(full_imagenet_model.input, output)

def preprocess_function(x):
    if x.ndim == 3:
        x = x[np.newaxis, :, :, :]
    return preprocess_input(x)

batch_size = 20

datagen = ImageDataGenerator(preprocessing_function=preprocess_function)

# train_flow = datagen.flow_from_directory(
#     train_folder,
#     target_size=(224, 224),
#     batch_size=batch_size,
#     class_mode='binary',
#     shuffle=True,
# )
#
#
# X, y = next(train_flow)
# print(X.shape, y.shape)
#
# features = []
# labels = []
#
# t0 = time()
# count = 0
# for X, y in train_flow:
#     if count >= 1800:
#         break
#     labels.append(y)
#     features.append(base_model.predict(X))
#     count += len(y)
#     if count % 5 == 0:
#         print("processed %d images at %d images/s"
#               % (count, count / (time() - t0)))
#
# labels_train = np.concatenate(labels)
# features_train = np.vstack(features)
# np.save('labels_train.last.npy', labels_train)
# np.save('features_train.last.npy', features_train)

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

valgen = ImageDataGenerator(preprocessing_function=preprocess_function)
val_flow = valgen.flow_from_directory(validation_folder, batch_size=batch_size,
                               target_size=(224, 224), shuffle=False,
                               class_mode='binary')

all_correct = []
for i, (X, y) in zip(range(179 // batch_size), val_flow):
    print(X)
    predictions = model.predict(X).ravel()
    correct = list((predictions > 0.5) == y)
    all_correct.extend(correct)
    print("Processed %d images" % len(all_correct))

print("Validation accuracy: %0.4f" % np.mean(all_correct))
