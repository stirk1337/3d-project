from django.contrib import admin
from .models import Project, Playground, Building


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name', 'user__username')
    list_filter = ('user',)


@admin.register(Playground)
class PlaygroundAdmin(admin.ModelAdmin):
    list_display = ('id', 'project', 'coordinates')
    search_fields = ('project__name',)


@admin.register(Building)
class BuildingAdmin(admin.ModelAdmin):
    list_display = ('id', 'project', 'floors', 'floors_height', 'coordinates')
    search_fields = ('project__name',)
    list_filter = ('floors',)
