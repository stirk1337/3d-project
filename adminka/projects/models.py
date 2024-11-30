from django.contrib.auth.models import User
from django.db import models


class Project(models.Model):
    name = models.CharField(max_length=255, default='Безымянный', verbose_name="Название")
    user = models.ManyToManyField(User, verbose_name="Пользователь")

    class Meta:
        verbose_name = 'Проект'
        verbose_name_plural = "Проекты"



class Playground(models.Model):
    project = models.OneToOneField(Project, on_delete=models.CASCADE, verbose_name="Проект")
    coordinates = models.JSONField(verbose_name='Координаты', help_text="Координаты в формате [{x: 10, y: 10}]", default=[{"x": 0, "y": 0}])

    class Meta:
        verbose_name = "Площадка"
        verbose_name_plural = "Площадки"


class Building(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, verbose_name="Проект")
    coordinates = models.JSONField(verbose_name='Координаты', help_text="Координаты в формате [{x: 10, y: 10}]", default=[{"x": 0, "y": 0}])
    floors = models.IntegerField(default=1, verbose_name="Количество этажей")
    floors_height = models.FloatField(default=3, verbose_name="Высота этажей")


    class Meta:
        verbose_name = "Здание"
        verbose_name_plural = "Здания"